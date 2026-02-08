import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ppp_write_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

interface SessionPayload {
  exp: number;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function getPin(): string {
  const pin = process.env.PEPPERS_PORTAL_PIN;
  if (!pin) {
    throw new Error("Missing PEPPERS_PORTAL_PIN environment variable.");
  }
  return pin;
}

function getSessionSecret(): string {
  return (
    process.env.PEPPERS_PORTAL_SESSION_SECRET ?? process.env.PEPPERS_PORTAL_PIN ?? ""
  );
}

function createSignature(payloadEncoded: string): string {
  const secret = getSessionSecret();
  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("base64url");
}

function createToken(payload: SessionPayload): string {
  const payloadEncoded = encodeBase64Url(JSON.stringify(payload));
  const signature = createSignature(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function parseToken(token: string): SessionPayload | null {
  const [payloadEncoded, providedSignature] = token.split(".");
  if (!payloadEncoded || !providedSignature) {
    return null;
  }

  const expectedSignature = createSignature(payloadEncoded);
  if (!expectedSignature) {
    return null;
  }
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  const providedBuffer = Buffer.from(providedSignature, "utf-8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(payloadEncoded)
    ) as SessionPayload;

    if (typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function safePinCompare(inputPin: string, expectedPin: string): boolean {
  const inputBuffer = Buffer.from(inputPin, "utf-8");
  const expectedBuffer = Buffer.from(expectedPin, "utf-8");

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function setWriteCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearWriteCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isWriteSessionAuthorized(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return parseToken(token) !== null;
}

export function requireWriteSession(
  request: NextRequest
): NextResponse | null {
  if (isWriteSessionAuthorized(request)) {
    return null;
  }

  return NextResponse.json({ error: "Write session required." }, { status: 401 });
}

export function createUnlockResponse(pin: string): NextResponse {
  const configuredPin = getPin();

  if (!safePinCompare(pin, configuredPin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const token = createToken({ exp: expiresAt });
  const response = NextResponse.json({ success: true });
  setWriteCookie(response, token);
  return response;
}

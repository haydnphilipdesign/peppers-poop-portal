import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWriteSession } from "@/lib/server/write-auth";

vi.mock("@/lib/server/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/server/write-auth", () => ({
  requireWriteSession: vi.fn(),
}));

function createRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/activities", {
    method,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("activities route", () => {
  const mockedRequireWriteSession = vi.mocked(requireWriteSession);
  const mockedGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

  beforeEach(() => {
    mockedRequireWriteSession.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid POST payloads", async () => {
    const response = await POST(createRequest("POST", { type: "toys" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid activity payload.",
    });
  });

  it("creates activities with an explicit timestamp", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    mockedGetSupabaseAdmin.mockReturnValue({ from } as never);

    const response = await POST(
      createRequest("POST", {
        type: "dinner",
        loggedBy: "Haydn",
        assignedTo: "Debbie",
        createdAt: "2026-04-10T17:45:00.000Z",
      })
    );

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("activities");
    expect(insert).toHaveBeenCalledWith({
      created_at: "2026-04-10T17:45:00.000Z",
      type: "dinner",
      logged_by: "Haydn",
      assigned_to: "Debbie",
    });
  });

  it("rejects invalid PATCH payloads", async () => {
    const response = await PATCH(createRequest("PATCH", { assignedTo: "Chris" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid activity payload.",
    });
  });

  it("updates activity assignee and timestamp", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    mockedGetSupabaseAdmin.mockReturnValue({ from } as never);

    const response = await PATCH(
      createRequest("PATCH", {
        id: "11111111-1111-4111-8111-111111111111",
        loggedBy: "Haydn",
        assignedTo: "Chris",
        createdAt: "2026-04-10T09:00:00.000Z",
      })
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      logged_by: "Haydn",
      assigned_to: "Chris",
      created_at: "2026-04-10T09:00:00.000Z",
    });
    expect(eq).toHaveBeenCalledWith("id", "11111111-1111-4111-8111-111111111111");
  });

  it("rejects invalid DELETE payloads", async () => {
    const response = await DELETE(createRequest("DELETE", {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid activity payload.",
    });
  });

  it("deletes activities by id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: remove });
    mockedGetSupabaseAdmin.mockReturnValue({ from } as never);

    const response = await DELETE(
      createRequest("DELETE", {
        id: "11111111-1111-4111-8111-111111111111",
      })
    );

    expect(response.status).toBe(200);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("id", "11111111-1111-4111-8111-111111111111");
  });

  it("returns write-session errors before touching Supabase", async () => {
    mockedRequireWriteSession.mockReturnValueOnce(
      NextResponse.json({ error: "Write session required." }, { status: 401 })
    );

    const response = await POST(
      createRequest("POST", {
        type: "toys",
        loggedBy: "Chris",
        assignedTo: "Chris",
      })
    );

    expect(response.status).toBe(401);
    expect(mockedGetSupabaseAdmin).not.toHaveBeenCalled();
  });
});

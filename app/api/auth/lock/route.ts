import { NextResponse } from "next/server";
import { clearWriteCookie } from "@/lib/server/write-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearWriteCookie(response);
  return response;
}

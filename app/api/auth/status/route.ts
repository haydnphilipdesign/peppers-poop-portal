import { NextRequest, NextResponse } from "next/server";
import { isWriteSessionAuthorized } from "@/lib/server/write-auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    unlocked: isWriteSessionAuthorized(request),
  });
}

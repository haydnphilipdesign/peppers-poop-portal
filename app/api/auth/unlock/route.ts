import { NextRequest, NextResponse } from "next/server";
import { unlockSchema } from "@/lib/schemas";
import { createUnlockResponse } from "@/lib/server/write-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = unlockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid unlock request." },
        { status: 400 }
      );
    }

    return createUnlockResponse(parsed.data.pin);
  } catch {
    return NextResponse.json(
      { error: "Unable to process unlock request." },
      { status: 400 }
    );
  }
}

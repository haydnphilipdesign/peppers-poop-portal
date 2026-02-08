import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { reminderCompleteSchema } from "@/lib/schemas";
import { requireWriteSession } from "@/lib/server/write-auth";

export async function POST(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = reminderCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder payload." },
        { status: 400 }
      );
    }

    const completedAt = parsed.data.completedAt ?? new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("reminders")
      .update({
        completed_at: completedAt,
        completed_by: parsed.data.completedBy,
      } as never)
      .eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process reminder completion." },
      { status: 400 }
    );
  }
}

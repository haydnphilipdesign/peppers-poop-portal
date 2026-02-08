import { NextRequest, NextResponse } from "next/server";
import { reminderLogSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWriteSession } from "@/lib/server/write-auth";

export async function POST(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = reminderLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder payload." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("reminders").insert({
      created_at: new Date().toISOString(),
      type: parsed.data.type,
      due_date: parsed.data.dueDate,
      completed_by: parsed.data.completedBy ?? null,
      completed_at: parsed.data.completedAt ?? null,
      notes: parsed.data.notes ?? null,
    } as never);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process reminder log." },
      { status: 400 }
    );
  }
}

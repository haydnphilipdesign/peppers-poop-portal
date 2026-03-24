import { NextRequest, NextResponse } from "next/server";
import { reminderScheduleSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWriteSession } from "@/lib/server/write-auth";

export async function POST(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = reminderScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder schedule payload." },
        { status: 400 }
      );
    }

    const scheduledAt = parsed.data.scheduledAt ?? new Date().toISOString();
    const supabase = getSupabaseAdmin();

    if (parsed.data.id) {
      const { error } = await supabase
        .from("reminders")
        .update({
          type: parsed.data.type,
          due_date: parsed.data.dueDate,
          appointment_at: parsed.data.appointmentAt,
          scheduled_at: scheduledAt,
          scheduled_by: parsed.data.scheduledBy,
          notes: parsed.data.notes ?? null,
        } as never)
        .eq("id", parsed.data.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("reminders").insert({
        created_at: new Date().toISOString(),
        type: parsed.data.type,
        due_date: parsed.data.dueDate,
        appointment_at: parsed.data.appointmentAt,
        scheduled_at: scheduledAt,
        scheduled_by: parsed.data.scheduledBy,
        completed_at: null,
        completed_by: null,
        notes: parsed.data.notes ?? null,
      } as never);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process reminder schedule." },
      { status: 400 }
    );
  }
}

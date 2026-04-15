import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import {
  activityCreateSchema,
  activityDeleteSchema,
  activityUpdateSchema,
} from "@/lib/schemas";
import { requireWriteSession } from "@/lib/server/write-auth";

export async function POST(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = activityCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid activity payload." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("activities").insert({
      created_at: parsed.data.createdAt ?? new Date().toISOString(),
      type: parsed.data.type,
      logged_by: parsed.data.loggedBy,
      assigned_to: parsed.data.assignedTo,
    } as never);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process activity log." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = activityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid activity payload." },
        { status: 400 }
      );
    }

    const updateValues = {
      logged_by: parsed.data.loggedBy,
      assigned_to: parsed.data.assignedTo,
      ...(parsed.data.createdAt
        ? { created_at: parsed.data.createdAt }
        : {}),
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("activities")
      .update(updateValues as never)
      .eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process activity update." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = activityDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid activity payload." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process activity deletion." },
      { status: 400 }
    );
  }
}

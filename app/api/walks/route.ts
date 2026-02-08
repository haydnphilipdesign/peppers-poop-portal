import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWriteSession } from "@/lib/server/write-auth";
import {
  walkCreateSchema,
  walkDeleteSchema,
  walkUpdateSchema,
} from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const unauthorized = requireWriteSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = walkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid walk payload." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("insert_walk", {
      p_created_at: parsed.data.createdAt ?? new Date().toISOString(),
      p_user_name: parsed.data.userName,
      p_has_poop: parsed.data.poop,
      p_has_pee: parsed.data.pee,
    } as never);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, logIds: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Unable to process walk creation." },
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
    const parsed = walkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid walk payload." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("replace_walk", {
      p_log_ids: parsed.data.logIds,
      p_created_at: parsed.data.createdAt,
      p_user_name: parsed.data.userName,
      p_has_poop: parsed.data.poop,
      p_has_pee: parsed.data.pee,
    } as never);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, logIds: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Unable to process walk update." },
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
    const parsed = walkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid walk payload." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc("delete_walk", {
      p_log_ids: parsed.data.logIds,
    } as never);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process walk deletion." },
      { status: 400 }
    );
  }
}

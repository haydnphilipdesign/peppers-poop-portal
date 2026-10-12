import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { requireWriteSession } from '@/lib/server/write-auth'
import { walkCreateSchema, walkDeleteSchema, walkUpdateSchema } from '@/lib/schemas'

async function mutate(request: NextRequest, operation: 'create' | 'update' | 'delete') {
    const unauthorized = requireWriteSession(request)
    if (unauthorized) return unauthorized
    let body: unknown
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid walk payload.' }, { status: 400 })
    }
    const schema = operation === 'create' ? walkCreateSchema : operation === 'update' ? walkUpdateSchema : walkDeleteSchema
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid walk payload. Reload the app if it is out of date.' }, { status: 400 })
    const value = parsed.data
    try {
        const { data, error } = await getSupabaseAdmin().rpc('mutate_walk_v2', {
            p_request_id: value.requestId, p_operation: operation,
            p_walk_id: 'walkId' in value ? value.walkId : null,
            p_expected_revision: 'expectedRevision' in value ? value.expectedRevision : null,
            p_created_at: 'createdAt' in value ? value.createdAt : null,
            p_user_name: 'userName' in value ? value.userName : null,
            p_has_poop: 'poop' in value ? value.poop : null,
            p_has_pee: 'pee' in value ? value.pee : null,
        })
        if (error) {
            const conflict = error.code === 'P0001'
            return NextResponse.json({ error: conflict ? 'This walk or request changed. Refresh and select the walk again.' : 'Unable to save the walk. Please retry your entry.' }, { status: conflict ? 409 : 500 })
        }
        return NextResponse.json({ success: true, ...data })
    } catch {
        return NextResponse.json({ error: 'Walk saving is unavailable. Please retry your entry.' }, { status: 503 })
    }
}

export const POST = (request: NextRequest) => mutate(request, 'create')
export const PATCH = (request: NextRequest) => mutate(request, 'update')
export const DELETE = (request: NextRequest) => mutate(request, 'delete')

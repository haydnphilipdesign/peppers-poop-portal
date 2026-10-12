import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { requireWriteSession } from '@/lib/server/write-auth'
import { DELETE, PATCH, POST } from './route'

vi.mock('@/lib/server/supabase-admin', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/server/write-auth', () => ({ requireWriteSession: vi.fn() }))
const requestId = '11111111-1111-4111-8111-111111111111'
const walkId = '22222222-2222-4222-8222-222222222222'
const draft = { requestId, createdAt: '2026-10-12T09:00:00.000Z', userName: 'Chris', poop: false, pee: false }
const request = (method: string, body: unknown) => new NextRequest('http://localhost/api/walks', { method, body: JSON.stringify(body) })

describe('atomic walk API', () => {
    const rpc = vi.fn()
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(requireWriteSession).mockReturnValue(null)
        vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never)
        rpc.mockResolvedValue({ data: { walkId, revision: 1 }, error: null })
    })
    it.each([POST, PATCH, DELETE])('requires PIN session before parsing or contacting the database', async handler => {
        vi.mocked(requireWriteSession).mockReturnValue(NextResponse.json({ error: 'Locked' }, { status: 401 }))
        expect((await handler(request('POST', draft))).status).toBe(401)
        expect(rpc).not.toHaveBeenCalled()
    })
    it('creates Neither without inventing an outcome and returns the parent identity', async () => {
        const response = await POST(request('POST', draft))
        expect(await response.json()).toEqual({ success: true, walkId, revision: 1 })
        expect(rpc).toHaveBeenCalledWith('mutate_walk_v2', {
            p_request_id: requestId, p_operation: 'create', p_walk_id: null, p_expected_revision: null,
            p_created_at: draft.createdAt, p_user_name: 'Chris', p_has_poop: false, p_has_pee: false,
        })
    })
    it.each([{ ...draft, requestId: undefined }, { ...draft, createdAt: 'bad' }, { ...draft, userName: 'Nobody' }, { ...draft, logIds: [walkId] }])('rejects malformed or old contracts before writing', async body => {
        expect((await POST(request('POST', body))).status).toBe(400)
        expect(rpc).not.toHaveBeenCalled()
    })
    it('edits/removes only by parent identity and expected revision', async () => {
        await PATCH(request('PATCH', { ...draft, walkId, expectedRevision: 3, poop: true }))
        expect(rpc.mock.calls[0][1]).toMatchObject({ p_operation: 'update', p_walk_id: walkId, p_expected_revision: 3 })
        await DELETE(request('DELETE', { requestId, walkId, expectedRevision: 3 }))
        expect(rpc.mock.calls[1][1]).toMatchObject({ p_operation: 'delete', p_walk_id: walkId, p_expected_revision: 3, p_has_poop: null })
        expect((await DELETE(request('DELETE', { logIds: [walkId] }))).status).toBe(400)
    })
    it('distinguishes conflicts from unavailable persistence', async () => {
        rpc.mockResolvedValueOnce({ error: { code: 'P0001', message: 'conflict' } })
        expect((await PATCH(request('PATCH', { ...draft, walkId, expectedRevision: 1 }))).status).toBe(409)
        rpc.mockResolvedValueOnce({ error: { code: 'XX000', message: 'private detail' } })
        const failure = await POST(request('POST', draft))
        expect(failure.status).toBe(500)
        expect(JSON.stringify(await failure.json())).not.toContain('private detail')
        rpc.mockRejectedValueOnce(new Error('Unavailable'))
        expect((await POST(request('POST', draft))).status).toBe(503)
    })
})

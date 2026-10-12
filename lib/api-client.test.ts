// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api-client'

afterEach(() => vi.unstubAllGlobals())

describe('expired write access', () => {
    it('signals expiration for a rejected care write and gives draft recovery guidance', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({ error: 'Write session required.' }), { status: 401 })))
        const expired = vi.fn()
        window.addEventListener('ppp:write-access-expired', expired)
        try {
            await expect(apiFetch('/api/activities', { method: 'POST' })).rejects.toMatchObject({ status: 401, message: expect.stringContaining('Unlock editing') })
            expect(expired).toHaveBeenCalledTimes(1)
            expired.mockClear()
            await expect(apiFetch('/api/auth/unlock', { method: 'POST' })).rejects.toThrow('Write session required.')
            expect(expired).not.toHaveBeenCalled()
        } finally {
            window.removeEventListener('ppp:write-access-expired', expired)
        }
    })
})

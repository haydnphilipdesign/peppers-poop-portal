// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Log } from '@/lib/database.types'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { read, write } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: (table: string) => {
            const query = {
                select: () => query,
                gte: () => query,
                lte: () => query,
                order: () => query,
                then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => read(table).then(resolve, reject),
            }
            return query
        },
    },
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: write }))
import { useLogs } from './use-logs'

type Result = { data: Log[]; error: { message: string } | null }
function deferred() {
    let resolve!: (value: Result) => void
    const promise = new Promise<Result>(done => { resolve = done })
    return { promise, resolve }
}
const sample: Log = { id: 'walk-1', created_at: new Date().toISOString(), type: 'poop', user_name: 'Chris', notes: null }

describe('dashboard data lifecycle', () => {
    let container: HTMLDivElement
    let root: ReturnType<typeof createRoot>
    let current: ReturnType<typeof useLogs>
    function Harness() {
        const logs = useLogs()
        React.useEffect(() => { current = logs }, [logs])
        return null
    }
    beforeEach(() => {
        read.mockReset()
        write.mockReset()
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })
    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })
    async function render() {
        await act(async () => root.render(React.createElement(Harness)))
    }
    function serve(logs: Log[] = [sample]) {
        read.mockImplementation((table: string) => Promise.resolve({ data: table === 'logs' ? logs : [], error: null }))
    }

    it('starts all five independent reads before any finishes', async () => {
        const pending = deferred()
        read.mockReturnValue(pending.promise)
        await render()
        expect(read).toHaveBeenCalledTimes(5)
        expect(current!.isLoading).toBe(true)
        expect(current!.hasLoaded).toBe(false)
        await act(async () => pending.resolve({ data: [], error: null }))
        expect(current!.isLoading).toBe(false)
        expect(current!.hasLoaded).toBe(true)
    })

    it('retains loaded walks during refresh and a failed read, then allows retry', async () => {
        serve()
        await render()
        const pending = deferred()
        read.mockReturnValue(pending.promise)
        await act(async () => window.dispatchEvent(new Event('ppp:data-changed')))
        expect(current!.isLoading).toBe(false)
        expect(current!.isRefreshing).toBe(true)
        expect(current!.todayWalksCount).toBe(1)
        await act(async () => pending.resolve({ data: [], error: { message: 'Offline' } }))
        expect(current!.error).toBe('Offline')
        expect(current!.todayWalksCount).toBe(1)
        expect(current!.isRefreshing).toBe(false)
        serve([])
        await act(async () => current!.refetch())
        expect(current!.error).toBeNull()
        expect(current!.todayWalksCount).toBe(0)
    })

    it('ignores an older response that finishes after a newer refresh', async () => {
        const old = deferred()
        read.mockReturnValue(old.promise)
        await render()
        serve()
        await act(async () => window.dispatchEvent(new Event('ppp:data-changed')))
        expect(current!.todayWalksCount).toBe(1)
        await act(async () => old.resolve({ data: [], error: null }))
        expect(current!.todayWalksCount).toBe(1)
    })

    it('propagates failed writes to the caller and refreshes only once after success', async () => {
        serve()
        await render()
        read.mockClear()
        write.mockRejectedValueOnce(new Error('Editing is locked'))
        await expect(current!.addWalk({ poop: true, pee: false, userName: 'Chris' })).rejects.toThrow('Editing is locked')
        expect(read).not.toHaveBeenCalled()
        write.mockResolvedValueOnce({ success: true })
        await act(async () => current!.addWalk({ poop: true, pee: false, userName: 'Chris' }))
        expect(read).toHaveBeenCalledTimes(5)
        expect(current!.error).toBeNull()
    })
})

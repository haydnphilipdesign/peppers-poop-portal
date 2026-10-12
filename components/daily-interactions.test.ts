// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createWalkFromLogs } from '@/lib/domain/metrics'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { logActivity, mode } = vi.hoisted(() => ({ logActivity: vi.fn(), mode: { user: 'Chris', readOnly: false, blocked: false } }))
vi.mock('@/lib/user-context', () => ({ useUser: () => ({ user: mode.user }) }))
vi.mock('@/lib/read-only-context', () => ({ useReadOnly: () => mode.readOnly, useRequireUnlock: () => undefined }))
vi.mock('@/hooks/use-activities', () => ({ useActivities: () => ({
    isToysFilled: false, isDinnerDone: false, toysFilledBy: null, dinnerDoneBy: null,
    isLoading: mode.blocked, hasLoaded: true, error: null, logActivity, refetch: vi.fn(),
}) }))
import { DailyRoutines } from './daily-routines'
import { WalkHistory } from './walk-history'

const walk = createWalkFromLogs([{ id: 'original', created_at: new Date(2026, 9, 12, 9).toISOString(), type: 'poop', user_name: 'Debbie', notes: null }])
describe('Daily profile attribution and guarded deletion', () => {
    let root: ReturnType<typeof createRoot>
    let container: HTMLDivElement
    const button = (name: string, scope: ParentNode = document) => {
        const match = Array.from(scope.querySelectorAll('button')).find(b => b.textContent?.trim() === name || b.getAttribute('aria-label') === name)
        if (!match) throw new Error(`Missing button ${name}`)
        return match
    }
    beforeEach(() => {
        mode.user = 'Chris'; mode.readOnly = false; mode.blocked = false
        logActivity.mockReset()
        container = document.createElement('div'); document.body.appendChild(container)
        root = createRoot(container)
    })
    afterEach(async () => { await act(async () => root.unmount()); container.remove() })

    it('uses the current profile in one tap, waits for acknowledgement, and guards synchronous double taps', async () => {
        let resolve!: () => void
        logActivity.mockImplementationOnce(() => new Promise<void>(r => { resolve = r }))
        mode.user = 'Debbie'
        await act(async () => root.render(React.createElement(DailyRoutines)))
        await act(async () => { button('Done by Debbie').click(); button('Done by Debbie').click() })
        expect(logActivity).toHaveBeenCalledTimes(1)
        expect(logActivity).toHaveBeenCalledWith('toys', 'Debbie', 'Debbie')
        expect(container.textContent).toContain('Saving routine...')
        expect(container.textContent).not.toContain('Change saved.')
        expect(button('Someone else').disabled).toBe(true)
        await act(async () => resolve())
        expect(container.textContent).toContain('Change saved.')
    })

    it('retains another-person picker after failure and access expiry; retries with explicit attribution', async () => {
        await act(async () => root.render(React.createElement(DailyRoutines)))
        await act(async () => button('Someone else').click())
        const group = document.querySelector('[role="group"]')!
        logActivity.mockRejectedValueOnce(new Error('Editing has locked. Unlock editing to retry.'))
        await act(async () => button('Done by Haydn', group).click())
        expect(logActivity).toHaveBeenCalledWith('toys', 'Chris', 'Haydn')
        expect(container.textContent).not.toContain('Change saved.')
        mode.readOnly = true
        await act(async () => root.render(React.createElement(DailyRoutines)))
        expect(container.querySelector('button')).toBeNull()
        mode.readOnly = false
        await act(async () => root.render(React.createElement(DailyRoutines)))
        expect(document.querySelector('[role="group"]')).not.toBeNull()
        logActivity.mockResolvedValueOnce(undefined)
        await act(async () => button('Done by Haydn', document.querySelector('[role="group"]')!).click())
        expect(logActivity).toHaveBeenCalledTimes(2)
        expect(container.querySelector('[role="group"]')).toBeNull()
        expect(container.textContent).toContain('Change saved.')
    })

    it('shows named confirmation before deleting Today; cancellation never writes; failed confirmation stays retryable', async () => {
        const remove = vi.fn().mockRejectedValueOnce(new Error('Removal unavailable')).mockResolvedValueOnce(undefined)
        await act(async () => root.render(React.createElement(WalkHistory, { walks: [walk], onDeleteWalk: remove, onUpdateWalk: vi.fn() })))
        const name = `Delete ${walk.timeFormatted} walk by Debbie`
        await act(async () => button(name).click())
        expect(remove).not.toHaveBeenCalled()
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain(`at ${walk.timeFormatted} by Debbie (poop)`)
        await act(async () => button('Cancel').click())
        expect(remove).not.toHaveBeenCalled()
        await act(async () => button(name).click())
        await act(async () => { button('Remove record').click(); button('Remove record').click() })
        expect(remove).toHaveBeenCalledTimes(1)
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Removal unavailable')
        expect(container.textContent).not.toContain('Change saved.')
        await act(async () => button('Remove record').click())
        expect(remove).toHaveBeenLastCalledWith(walk)
        expect(container.textContent).toContain('Change saved.')
    })

    it('blocks a previously opened confirmation if editing becomes locked or a read is pending', async () => {
        const remove = vi.fn()
        const render = () => root.render(React.createElement(WalkHistory, { walks: [walk], onDeleteWalk: remove, onUpdateWalk: vi.fn(), updatesBlocked: mode.blocked }))
        await act(async () => render())
        await act(async () => button(`Delete ${walk.timeFormatted} walk by Debbie`).click())
        mode.blocked = true
        await act(async () => render())
        await act(async () => button('Remove record').click())
        expect(remove).not.toHaveBeenCalled()
        mode.blocked = false; mode.readOnly = true
        await act(async () => render())
        expect(button('Remove record').disabled).toBe(true)
        mode.readOnly = false
        await act(async () => render())
        await act(async () => button('Remove record').click())
        expect(remove).toHaveBeenCalledTimes(1)
    })
    it('keeps confirmation blocked through changed, empty, and replacement snapshots instead of removing an old target', async () => {
        const remove = vi.fn()
        const render = (walks: typeof walk[]) => root.render(React.createElement(WalkHistory, { walks, onDeleteWalk: remove, onUpdateWalk: vi.fn() }))
        await act(async () => render([walk]))
        await act(async () => button(`Delete ${walk.timeFormatted} walk by Debbie`).click())
        const changed = createWalkFromLogs([{ ...walk.logs[0], user_name: 'Chris' }])
        for (const walks of [[changed], [], [createWalkFromLogs([{ ...walk.logs[0], id: 'replacement' }])]]) {
            await act(async () => render(walks))
            expect(button('Remove record').disabled).toBe(true)
            expect(document.querySelector('[role="dialog"]')?.textContent).toContain('This walk changed or was removed')
            await act(async () => button('Remove record').click())
        }
        expect(remove).not.toHaveBeenCalled()
        await act(async () => button('Cancel').click())
    })

})

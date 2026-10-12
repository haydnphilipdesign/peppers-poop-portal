// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRoutineStatus } from '@/lib/activity-utils'
import { createWalkFromLogs } from '@/lib/domain/metrics'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { addWalk, updateWalk, deleteWalk, logActivity, deleteActivity, mode } = vi.hoisted(() => ({ addWalk: vi.fn(), updateWalk: vi.fn(), deleteWalk: vi.fn(), logActivity: vi.fn(), deleteActivity: vi.fn(), mode: { assignee: 'Debbie' as 'Debbie' | 'Haydn', complete: false, readOnly: false, blocked: false } }))
const date = new Date(2026, 9, 11, 9, 0)
const walk = createWalkFromLogs([{ id: 'log-1', created_at: date.toISOString(), type: 'poop', user_name: 'Chris', notes: null }])
vi.mock('@/lib/user-context', () => ({ useUser: () => ({ user: 'Chris' }) }))
vi.mock('@/lib/read-only-context', () => ({ useReadOnly: () => mode.readOnly, useRequireUnlock: () => undefined }))
vi.mock('@/hooks/use-history', () => ({ useHistory: () => ({
    selectedDate: date, setSelectedDate: vi.fn(), dayStats: { walks: [walk], poopCount: 1, peeCount: 0, walksCount: 1 },
    toysStatus: getRoutineStatus(mode.complete ? [{ id: 'routine-1', type: 'toys', created_at: date.toISOString(), logged_by: 'Chris', assigned_to: mode.assignee }] : [], 'toys', date), dinnerStatus: getRoutineStatus([], 'dinner', date),
    isLoading: false, isRefreshing: mode.blocked, error: null, refetch: vi.fn(), goToPreviousDay: vi.fn(), goToNextDay: vi.fn(),
    isToday: false, addWalk, updateWalk, deleteWalk, logActivity, updateActivity: vi.fn(), deleteActivity,
}) }))
vi.mock('@/components/ui/button', () => ({ Button: ({ children, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
    void variant; void size
    return React.createElement('button', props, children)
} }))
import { HistoryView } from './history-view'

describe('History failure recovery', () => {
    let root: ReturnType<typeof createRoot>
    let container: HTMLDivElement
    const button = (name: string) => {
        const found = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === name || b.getAttribute('aria-label') === name)
        if (!found) throw new Error(`Missing button: ${name}`)
        return found
    }
    beforeEach(async () => {
        for (const mutation of [addWalk, updateWalk, deleteWalk, logActivity, deleteActivity]) mutation.mockReset()
        mode.assignee = 'Debbie'; mode.complete = false; mode.readOnly = false; mode.blocked = false
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        await act(async () => root.render(React.createElement(HistoryView)))
    })
    afterEach(async () => { await act(async () => root.unmount()); container.remove() })

    it('keeps the create draft and feedback beside it after rejection, blocks rapid taps, then clears only on success', async () => {
        addWalk.mockRejectedValueOnce(new Error('Save unavailable. Please try again.'))
        await act(async () => button('Add Walk').click())
        await act(async () => button('Poop').click())
        const input = container.querySelector<HTMLInputElement>('input[type="time"]')!
        const value = input.value
        await act(async () => { button('Save Walk').click(); button('Save Walk').click() })
        expect(addWalk).toHaveBeenCalledTimes(1)
        expect(container.querySelector('input[type="time"]')).toBe(input)
        expect(input.value).toBe(value)
        expect(button('Poop').getAttribute('aria-pressed')).toBe('true')
        expect(container.querySelector('[role="alert"]')?.closest('[data-slot="card-content"]')?.contains(input)).toBe(true)
        expect(container.textContent).not.toContain('Change saved.')
        addWalk.mockResolvedValueOnce(undefined)
        await act(async () => button('Save Walk').click())
        expect(container.querySelector('input[type="time"]')).toBeNull()
        expect(container.textContent).toContain('Change saved.')
    })

    it('retains the edit form and original record on failed edit and delete', async () => {
        updateWalk.mockRejectedValueOnce(new Error('Edit unavailable'))
        await act(async () => button('Edit walk').click())
        const input = container.querySelector<HTMLInputElement>('input[type="time"]')!
        await act(async () => button('Save Changes').click())
        expect(container.querySelector('input[type="time"]')).toBe(input)
        expect(container.textContent).toContain('Edit unavailable')
        await act(async () => button('Cancel editing walk').click())
        deleteWalk.mockRejectedValueOnce(new Error('Delete unavailable'))
        await act(async () => button('Delete walk').click())
        expect(deleteWalk).not.toHaveBeenCalled()
        await act(async () => button('Remove record').click())
        expect(button('Delete walk')).toBeDefined()
        expect(container.textContent).toContain('Delete unavailable')
        expect(container.textContent).not.toContain('Change saved.')
    })

    it('keeps routine attribution open on rejection and closes it after an acknowledged retry', async () => {
        logActivity.mockRejectedValueOnce(new Error('Routine unavailable'))
        await act(async () => button('Someone else').click())
        await act(async () => button('Debbie').click())
        expect(button('Debbie').disabled).toBe(false)
        expect(container.textContent).toContain('Routine unavailable')
        logActivity.mockResolvedValueOnce(undefined)
        await act(async () => button('Debbie').click())
        expect(logActivity).toHaveBeenLastCalledWith('toys', 'Chris', 'Debbie', expect.any(Date))
        expect(Array.from(container.querySelectorAll('button')).some(b => b.textContent === 'Debbie')).toBe(false)
        expect(container.textContent).toContain('Change saved.')
    })
    it('requires explicit confirmation for a routine and retains the target on failed removal', async () => {
        mode.complete = true
        await act(async () => root.render(React.createElement(HistoryView)))
        await act(async () => button('Remove').click())
        expect(deleteActivity).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('Fill Toys on Sunday, October 11, 2026, done by Debbie.')
        await act(async () => button('Cancel').click())
        expect(deleteActivity).not.toHaveBeenCalled()
        await act(async () => button('Remove').click())
        deleteActivity.mockRejectedValueOnce(new Error('Removal unavailable'))
        await act(async () => { button('Remove record').click(); button('Remove record').click() })
        expect(deleteActivity).toHaveBeenCalledTimes(1)
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Removal unavailable')
        deleteActivity.mockResolvedValueOnce(undefined)
        await act(async () => button('Remove record').click())
        expect(deleteActivity).toHaveBeenLastCalledWith('routine-1')
        expect(container.textContent).toContain('Change saved.')
    })

    it('defaults historical routine attribution to the selected profile', async () => {
        await act(async () => button('Done by Chris').click())
        expect(logActivity).toHaveBeenCalledWith('toys', 'Chris', 'Chris', expect.any(Date))
    })

    it('blocks removal if a foreground snapshot changed routine attribution while confirmation was open', async () => {
        mode.complete = true
        await act(async () => root.render(React.createElement(HistoryView)))
        await act(async () => button('Remove').click())
        mode.assignee = 'Haydn'
        await act(async () => root.render(React.createElement(HistoryView)))
        expect(button('Remove record').disabled).toBe(true)
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain('This record changed or was removed')
        await act(async () => button('Remove record').click())
        expect(deleteActivity).not.toHaveBeenCalled()
    })

})

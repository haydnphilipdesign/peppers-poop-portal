// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRoutineStatus } from '@/lib/activity-utils'
import { createWalkFromLogs } from '@/lib/domain/metrics'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { addWalk, updateWalk, deleteWalk, logActivity } = vi.hoisted(() => ({ addWalk: vi.fn(), updateWalk: vi.fn(), deleteWalk: vi.fn(), logActivity: vi.fn() }))
const date = new Date(2026, 9, 11, 9, 0)
const walk = createWalkFromLogs([{ id: 'log-1', created_at: date.toISOString(), type: 'poop', user_name: 'Chris', notes: null }])
vi.mock('@/lib/user-context', () => ({ useUser: () => ({ user: 'Chris' }) }))
vi.mock('@/lib/read-only-context', () => ({ useReadOnly: () => false, useRequireUnlock: () => undefined }))
vi.mock('@/hooks/use-history', () => ({ useHistory: () => ({
    selectedDate: date, setSelectedDate: vi.fn(), dayStats: { walks: [walk], poopCount: 1, peeCount: 0, walksCount: 1 },
    toysStatus: getRoutineStatus([], 'toys', date), dinnerStatus: getRoutineStatus([], 'dinner', date),
    isLoading: false, isRefreshing: false, error: null, refetch: vi.fn(), goToPreviousDay: vi.fn(), goToNextDay: vi.fn(),
    isToday: false, addWalk, updateWalk, deleteWalk, logActivity, updateActivity: vi.fn(), deleteActivity: vi.fn(),
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
        const found = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.trim() === name || b.getAttribute('aria-label') === name)
        if (!found) throw new Error(`Missing button: ${name}`)
        return found
    }
    beforeEach(async () => {
        for (const mutation of [addWalk, updateWalk, deleteWalk, logActivity]) mutation.mockReset()
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
        expect(button('Delete walk')).toBeDefined()
        expect(container.textContent).toContain('Delete unavailable')
        expect(container.textContent).not.toContain('Change saved.')
    })

    it('keeps routine attribution open on rejection and closes it after an acknowledged retry', async () => {
        logActivity.mockRejectedValueOnce(new Error('Routine unavailable'))
        await act(async () => button('Log').click())
        await act(async () => button('Debbie').click())
        expect(button('Debbie').disabled).toBe(false)
        expect(container.textContent).toContain('Routine unavailable')
        logActivity.mockResolvedValueOnce(undefined)
        await act(async () => button('Debbie').click())
        expect(logActivity).toHaveBeenLastCalledWith('toys', 'Chris', 'Debbie', expect.any(Date))
        expect(Array.from(container.querySelectorAll('button')).some(b => b.textContent === 'Debbie')).toBe(false)
        expect(container.textContent).toContain('Change saved.')
    })
})

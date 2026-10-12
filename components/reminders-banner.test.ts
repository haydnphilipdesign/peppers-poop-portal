// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from '@/lib/database.types'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { state, refetch, completeReminder } = vi.hoisted(() => ({
    state: { isLoading: true, hasLoaded: false, error: null as string | null, readOnly: false, overdueReminders: [] as Reminder[] },
    refetch: vi.fn(), completeReminder: vi.fn(),
}))
vi.mock('@/lib/user-context', () => ({ useUser: () => ({ user: 'Chris' }) }))
vi.mock('@/lib/read-only-context', () => ({ useReadOnly: () => state.readOnly, useRequireUnlock: () => undefined }))
vi.mock('@/hooks/use-reminders', () => ({ useReminders: () => ({
    ...state, isSimparicaDue: false, isGroomingDue: false, groomingAppointmentReminder: null,
    addReminder: vi.fn(), scheduleReminder: vi.fn(), completeReminder,
    getLastCompletedDate: () => null, refetch,
}) }))
import { RemindersBanner } from './reminders-banner'

const reminder: Reminder = {
    id: 'vet-alert', type: 'vet', due_date: '2026-10-01', created_at: '2026-10-01T12:00:00Z',
    appointment_at: null, scheduled_at: null, scheduled_by: null, completed_at: null, completed_by: null, notes: null,
}
describe('Due care visibility follows read certainty', () => {
    let container: HTMLDivElement
    let root: ReturnType<typeof createRoot>
    const render = async () => { await act(async () => root.render(React.createElement(RemindersBanner))) }
    const section = () => container.querySelector('section[aria-label="Due care"]')
    const click = async (name: string) => {
        const button = [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === name)
        if (!button) throw new Error(`Missing button: ${name}`)
        await act(async () => button.click())
    }
    beforeEach(() => {
        Object.assign(state, { isLoading: true, hasLoaded: false, error: null, readOnly: false, overdueReminders: [] })
        refetch.mockReset(); refetch.mockResolvedValue(undefined)
        completeReminder.mockReset(); completeReminder.mockResolvedValue(undefined)
        container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
    })
    afterEach(async () => { await act(async () => root.unmount()); container.remove() })

    it('shows compact checking feedback until the first successful empty read, then removes the entire section', async () => {
        await render()
        expect(section()?.textContent).toContain('Checking due care...')
        expect(container.textContent).not.toContain('No care alerts')
        state.isLoading = false; state.hasLoaded = true
        await render()
        expect(section()).toBeNull()
        expect(container.textContent).toBe('')
    })

    it('keeps a failed initial read distinct from empty and offers a read retry', async () => {
        state.isLoading = false; state.error = 'Reminders could not be checked.'
        await render()
        expect(section()).not.toBeNull()
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not be checked')
        await click('Retry care alerts')
        expect(refetch).toHaveBeenCalledTimes(1)
        expect(completeReminder).not.toHaveBeenCalled()
        state.isLoading = true
        await render()
        expect([...container.querySelectorAll('button')].find(b => b.textContent === 'Retry care alerts')?.disabled).toBe(true)
        expect(section()).not.toBeNull()
    })

    it('restores feedback when a previously empty snapshot is refreshing or fails', async () => {
        state.hasLoaded = true; state.isLoading = false
        await render(); expect(section()).toBeNull()
        state.isLoading = true
        await render(); expect(section()?.textContent).toContain('Refreshing care alerts...')
        state.isLoading = false; state.error = 'Displayed data may be out of date.'
        await render(); expect(section()).not.toBeNull()
        expect(container.textContent).not.toContain('No care alerts')
        state.error = null
        await render(); expect(section()).toBeNull()
    })

    it('retains known alerts and an opened completion picker through refresh and failure', async () => {
        state.hasLoaded = true; state.isLoading = false; state.overdueReminders = [reminder]
        await render(); await click('Done')
        for (const phase of [{ isLoading: true, error: null }, { isLoading: false, error: 'Read unavailable' }]) {
            Object.assign(state, phase); await render()
            expect(section()?.textContent).toContain('Vet Appointment was due')
            expect([...container.querySelectorAll('button')].find(b => b.textContent === 'Chris')?.disabled).toBe(true)
            await click('Chris'); expect(completeReminder).not.toHaveBeenCalled()
        }
        state.error = null; await render(); await click('Chris')
        expect(completeReminder).toHaveBeenCalledWith('vet-alert', 'Chris')
    })

    it('keeps failed-save recovery and success announcements when the last alert disappears', async () => {
        state.hasLoaded = true; state.isLoading = false; state.overdueReminders = [reminder]
        completeReminder.mockRejectedValueOnce(new Error('Save unavailable. Your input has been kept.'))
        await render(); await click('Done'); await click('Debbie')
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('Save unavailable')
        expect(container.textContent).not.toContain('Change saved.')
        await click('Debbie')
        expect(completeReminder).toHaveBeenCalledTimes(2)
        state.overdueReminders = []; await render()
        expect(section()).toBeNull()
        expect(container.querySelector('[role="status"]')?.textContent).toBe('Change saved.')
    })

    it('uses the same certainty rules in the public read-only view without write controls', async () => {
        state.readOnly = true; state.hasLoaded = true; state.isLoading = false; state.overdueReminders = [reminder]
        await render(); expect(section()?.textContent).toContain('Vet Appointment was due')
        expect(container.querySelector('button')).toBeNull()
        state.isLoading = true; await render(); expect(section()?.textContent).toContain('Vet Appointment was due')
        state.isLoading = false; state.overdueReminders = []; await render(); expect(section()).toBeNull()
    })
})

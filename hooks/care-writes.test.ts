// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { CareDataProvider } from '@/lib/care-data-context'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Activity, Log, Reminder } from '@/lib/database.types'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { read, write } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiFetch: write }))
vi.mock('@/lib/supabase', () => ({ supabase: {
    from: (table: string) => {
        const query = {
            select: () => query, gte: () => query, lte: () => query, order: () => query,
            then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => read(table).then(resolve, reject),
        }
        return query
    },
} }))
import { walkFixtures } from '@/lib/walk-test-fixtures'
import { useHistory } from './use-history'
import { useActivities } from './use-activities'
import { useReminders } from './use-reminders'

const now = new Date()
const log: Log = { id: 'log-1', type: 'poop', user_name: 'Chris', created_at: now.toISOString(), notes: null }
const activity: Activity = { id: 'routine-1', type: 'toys', logged_by: 'Chris', assigned_to: 'Debbie', created_at: now.toISOString() }
const reminder: Reminder = { id: 'reminder-1', type: 'vet', created_at: now.toISOString(), due_date: '2026-10-20', appointment_at: now.toISOString(), scheduled_at: now.toISOString(), scheduled_by: 'Chris', completed_at: null, completed_by: null, notes: null }

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(done => { resolve = done })
    return { promise, resolve }
}

describe('acknowledged care writes and mounted consumers', () => {
    let root: ReturnType<typeof createRoot>
    let container: HTMLDivElement
    let history: ReturnType<typeof useHistory>
    let today: ReturnType<typeof useActivities>
    let banner: ReturnType<typeof useReminders>
    let schedule: ReturnType<typeof useReminders>
    let records: Record<string, (Log | Activity | Reminder)[]>
    function Harness() {
        const h = useHistory()
        const t = useActivities()
        const b = useReminders()
        const s = useReminders()
        React.useEffect(() => { history = h; today = t; banner = b; schedule = s }, [h, t, b, s])
        return null
    }
    beforeEach(async () => {
        write.mockReset()
        read.mockReset()
        records = { logs: [log], activities: [activity], reminders: [reminder] }
        read.mockImplementation((table: string) => Promise.resolve({ data: table === 'walks' ? walkFixtures(records.logs as Log[]) : records[table], error: null }))
        container = document.createElement('div')
        root = createRoot(container)
        await act(async () => root.render(React.createElement(CareDataProvider, null, React.createElement(Harness))))
        await act(async () => history.setSelectedDate(now))
        read.mockClear()
    })
    afterEach(async () => { await act(async () => root.unmount()) })

    const mutations = [
        ['History add walk', () => history.addWalk({ poop: true, pee: false, userName: 'Chris', createdAt: now })],
        ['History edit walk', () => history.updateWalk(history.dayStats!.walks[0], { poop: true, pee: true, userName: 'Debbie', time: now })],
        ['History delete walk', () => history.deleteWalk(history.dayStats!.walks[0])],
        ['History add routine', () => history.logActivity('toys', 'Chris', 'Debbie', now)],
        ['History edit routine', () => history.updateActivity(activity.id, 'Chris', 'Debbie', now)],
        ['History delete routine', () => history.deleteActivity(activity.id)],
        ['Today routine', () => today.logActivity('dinner', 'Chris', 'Debbie')],
        ['Reminder log', () => schedule.addReminder('grooming', now, undefined, 'Chris')],
        ['Reminder schedule', () => schedule.scheduleReminder('vet', now, 'Debbie')],
        ['Reminder complete', () => banner.completeReminder(reminder.id, 'Debbie')],
    ] as const

    it.each(mutations)('%s rejects failed writes without changing care state or refetching', async (_, mutate) => {
        write.mockRejectedValueOnce(new Error('Write rejected'))
        await expect(mutate()).rejects.toThrow('Write rejected')
        expect(read).not.toHaveBeenCalled()
        expect(history.dayStats!.poopCount).toBe(1)
        expect(today.isDinnerDone).toBe(false)
        expect(schedule.activeVetReminder?.scheduled_by).toBe('Chris')
        expect(banner.reminders[0].completed_at).toBeNull()
        expect(history.error).toBeNull()
    })

    it('updates Today and already mounted History once after routine edits and deletions', async () => {
        write.mockImplementation(async () => { records.activities = [{ ...activity, assigned_to: 'Haydn' }]; return { success: true } })
        await act(async () => history.updateActivity(activity.id, 'Chris', 'Haydn', now))
        expect(today.toysFilledBy).toBe('Haydn')
        expect(history.toysStatus.activity?.assigned_to).toBe('Haydn')
        expect(read.mock.calls.filter(([table]) => table === 'activities')).toHaveLength(1)
        read.mockClear()
        write.mockImplementation(async () => { records.activities = []; return { success: true } })
        await act(async () => history.deleteActivity(activity.id))
        expect(today.isToysFilled).toBe(false)
        expect(history.toysStatus.activity).toBeNull()
        expect(read.mock.calls.filter(([table]) => table === 'activities')).toHaveLength(1)
    })

    it('shares one reminder refresh across consumers and never publishes pending completion', async () => {
        const pending = deferred<{ success: boolean }>()
        write.mockReturnValue(pending.promise)
        let save!: Promise<void>
        await act(async () => { save = banner.completeReminder(reminder.id, 'Debbie') })
        expect(banner.reminders[0].completed_at).toBeNull()
        expect(schedule.reminders[0].completed_at).toBeNull()
        expect(read).not.toHaveBeenCalled()
        records.reminders = [{ ...reminder, completed_at: now.toISOString(), completed_by: 'Debbie' }]
        await act(async () => { pending.resolve({ success: true }); await save })
        expect(banner.reminders[0].completed_by).toBe('Debbie')
        expect(schedule.reminders[0].completed_by).toBe('Debbie')
        expect(read.mock.calls.filter(([table]) => table === 'reminders')).toHaveLength(1)
    })

    it.each(['history', 'today', 'reminders'])('a saved %s change resolves despite failed reads and keeps a stale snapshot with refresh guidance', async resource => {
        write.mockResolvedValue({ success: true })
        read.mockResolvedValue({ data: null, error: { message: 'Read unavailable' } })
        await act(async () => {
            if (resource === 'history') await history.deleteWalk(history.dayStats!.walks[0])
            else if (resource === 'today') await today.logActivity('dinner', 'Chris', 'Debbie')
            else await schedule.completeReminder(reminder.id, 'Debbie')
        })
        expect(history.error).toContain('Change saved')
        expect(today.error).toContain('do not save again')
        if (resource === 'reminders') expect(schedule.error).toContain('Change saved')
        expect(history.dayStats!.poopCount).toBe(1)
        expect(today.toysFilledBy).toBe('Debbie')
        expect(today.isDinnerDone).toBe(false)
    })

    it('does not relabel the previous day as new data or accept a late response after date navigation', async () => {
        const old = deferred<{ data: Log[]; error: null }>()
        read.mockReturnValue(old.promise)
        const earlier = new Date(now); earlier.setDate(earlier.getDate() - 2)
        await act(async () => history.setSelectedDate(earlier))
        expect(history.dayStats).toBeNull()
        read.mockResolvedValue({ data: [], error: null })
        await act(async () => history.setSelectedDate(now))
        expect(history.dayStats?.poopCount).toBe(1) // Same-date cached snapshot.
        await act(async () => history.refetch())
        expect(history.dayStats?.poopCount).toBe(0)
        await act(async () => old.resolve({ data: [log], error: null }))
        expect(history.dayStats?.poopCount).toBe(0)
    })

    it.each(['activities', 'reminders'])('ignores an older %s refresh after a newer snapshot arrives', async resource => {
        const old = deferred<{ data: (Activity | Reminder)[]; error: null }>()
        read.mockImplementation((table: string) => table === resource
            ? old.promise
            : Promise.resolve({ data: records[table], error: null }))
        const event = resource === 'activities' ? 'ppp:data-changed' : 'ppp:reminders-changed'
        await act(async () => window.dispatchEvent(new Event(event)))
        expect(resource === 'activities' ? today.toysFilledBy : schedule.activeVetReminder?.scheduled_by).toBe(resource === 'activities' ? 'Debbie' : 'Chris')
        records[resource] = resource === 'activities'
            ? [{ ...activity, assigned_to: 'Haydn' }]
            : [{ ...reminder, scheduled_by: 'Haydn' }]
        read.mockImplementation((table: string) => Promise.resolve({ data: records[table], error: null }))
        await act(async () => window.dispatchEvent(new Event(event)))
        await act(async () => old.resolve({ data: [], error: null }))
        expect(resource === 'activities' ? today.toysFilledBy : schedule.activeVetReminder?.scheduled_by).toBe('Haydn')
    })
})

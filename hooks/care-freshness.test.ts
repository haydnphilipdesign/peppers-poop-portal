// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CareDataProvider, dateRange, nextCalendarCheck } from '@/lib/care-data-context'
import { CareDataStore } from '@/lib/care-data-store'
import type { CareQuery } from '@/lib/care-data-store'
import type { Activity, Log, Reminder } from '@/lib/database.types'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { read, auth } = vi.hoisted(() => ({ read: vi.fn(), auth: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiFetch: auth }))
vi.mock('@/lib/supabase', () => ({ supabase: {
    from: (table: string) => {
        const scope: { table: string; start?: string; end?: string } = { table }
        const query = {
            select: () => query,
            gte: (_: string, value: string) => { scope.start = value; return query },
            lte: (_: string, value: string) => { scope.end = value; return query },
            order: () => query,
            then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => read(scope).then(resolve, reject),
        }
        return query
    },
} }))
import { walkFixtures } from '@/lib/walk-test-fixtures'
import { useLogs } from './use-logs'
import { useActivities } from './use-activities'
import { useReminders } from './use-reminders'
import { useHistory, useAnalytics } from './use-history'
import { useMonthlyChampion } from './use-champion'
import { useWriteAccess } from './use-write-access'
import { LastWalkCard } from '@/components/last-walk-card'

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(done => { resolve = done })
    return { promise, resolve }
}
type Result = { data: unknown[]; error: null | { message: string } }
const ok = (data: unknown[] = []): Result => ({ data, error: null })
const failure: Result = { data: [], error: { message: 'Unavailable' } }

describe('shared snapshots and foreground/calendar freshness', () => {
    let root: ReturnType<typeof createRoot>
    let container: HTMLDivElement
    let logs: ReturnType<typeof useLogs>
    let today: ReturnType<typeof useActivities>
    let banner: ReturnType<typeof useReminders>
    let schedule: ReturnType<typeof useReminders>
    let history: ReturnType<typeof useHistory>
    let analytics: ReturnType<typeof useAnalytics>
    let champion: ReturnType<typeof useMonthlyChampion>
    let access: ReturnType<typeof useWriteAccess>
    let records: { logs: Log[]; activities: Activity[]; reminders: Reminder[] }
    const start = new Date(2026, 9, 31, 23, 59, 50)
    const fixtureLog: Log = { id: 'log', type: 'poop', created_at: start.toISOString(), user_name: 'Chris', notes: null }
    const fixtureActivity: Activity = { id: 'routine', type: 'toys', created_at: start.toISOString(), logged_by: 'Chris', assigned_to: 'Debbie' }
    const fixtureReminder: Reminder = { id: 'reminder', type: 'vet', created_at: start.toISOString(), due_date: '2026-10-31', appointment_at: start.toISOString(), scheduled_by: 'Chris', scheduled_at: start.toISOString(), completed_at: null, completed_by: null, notes: null }
    function Harness() {
        const l = useLogs(), t = useActivities(), b = useReminders(), s = useReminders()
        const h = useHistory(), a = useAnalytics(), c = useMonthlyChampion(), w = useWriteAccess()
        React.useEffect(() => {
            logs = l; today = t; banner = b; schedule = s
            history = h; analytics = a; champion = c; access = w
        }, [l, t, b, s, h, a, c, w])
        return React.createElement(LastWalkCard, { walk: l.latestWalk, isLoading: l.latestIsLoading })
    }
    function serve() {
        read.mockImplementation((scope: CareQuery) => Promise.resolve(ok((scope.table === 'walks' ? walkFixtures(records.logs) : records[scope.table]).filter(row => {
            const time = row.created_at
            return (!scope.start || time >= scope.start) && (!scope.end || time <= scope.end)
        }))))
    }
    beforeEach(() => {
        vi.useFakeTimers(); vi.setSystemTime(start)
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
        records = { logs: [fixtureLog], activities: [fixtureActivity], reminders: [fixtureReminder] }
        read.mockReset(); auth.mockReset(); auth.mockResolvedValue({ unlocked: true }); serve()
        container = document.createElement('div')
        root = createRoot(container)
    })
    afterEach(async () => {
        await act(async () => root.unmount())
        vi.useRealTimers(); vi.restoreAllMocks()
    })
    async function render() { await act(async () => root.render(React.createElement(CareDataProvider, null, React.createElement(Harness)))) }
    async function foreground() {
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'))
            window.dispatchEvent(new Event('focus'))
            await vi.advanceTimersByTimeAsync(50)
        })
    }

    it('shares one pending reminder read across banner, schedule, current scores and champion', async () => {
        const pending = deferred<Result>()
        read.mockImplementation((scope: CareQuery) => scope.table === 'reminders' ? pending.promise : Promise.resolve(ok()))
        await render()
        expect(read.mock.calls.filter(([scope]) => scope.table === 'reminders')).toHaveLength(1)
        expect(banner.hasLoaded).toBe(false)
        expect(schedule.hasLoaded).toBe(false)
        await act(async () => pending.resolve(ok([fixtureReminder])))
        expect(banner.reminders).toBe(schedule.reminders)
        expect(logs.scoringHasLoaded).toBe(true)
        expect(champion.isLoading).toBe(false)
    })

    it.each(['activities', 'reminders'])('%s scoring failure cannot hide walks or today totals', async table => {
        read.mockImplementation((scope: CareQuery) => Promise.resolve(scope.table === table ? failure : ok(scope.table === 'walks' ? walkFixtures([fixtureLog]) : scope.table === 'logs' ? [fixtureLog] : [])))
        await render()
        expect(logs.todayWalksCount).toBe(1)
        expect(logs.latestWalk?.userName).toBe('Chris')
        expect(logs.hasLoaded).toBe(true)
        expect(logs.error).toBeNull()
        expect(logs.latestError).toBeNull()
        expect(logs.scoringError).toContain('Leaderboard could not be checked')
        expect(logs.scoringHasLoaded).toBe(false)
    })

    it('publishes today without waiting for monthly or recent log reads', async () => {
        const pending = deferred<Result>()
        const scope = dateRange(start)
        read.mockImplementation((query: CareQuery) => query.table === 'walks' && query.start !== scope.start ? pending.promise : Promise.resolve(ok(query.table === 'walks' ? walkFixtures([fixtureLog]) : query.table === 'logs' ? [fixtureLog] : [])))
        await render()
        expect(logs.todayWalksCount).toBe(1)
        expect(logs.isLoading).toBe(false)
        expect(logs.latestIsLoading).toBe(true)
        await act(async () => pending.resolve(failure))
        expect(logs.todayWalksCount).toBe(1)
        expect(logs.error).toBeNull()
        expect(logs.latestError).toBeTruthy()
    })

    it('a reminder save refreshes shared rows once and recalculates current and previous month scoring', async () => {
        await render(); read.mockClear()
        auth.mockImplementation(async () => {
            records.reminders = [{ ...fixtureReminder, completed_at: start.toISOString(), completed_by: 'Debbie' }]
            return { success: true }
        })
        await act(async () => banner.completeReminder(fixtureReminder.id, 'Debbie'))
        expect(read.mock.calls.filter(([scope]) => scope.table === 'reminders')).toHaveLength(1)
        expect(schedule.reminders[0].completed_by).toBe('Debbie')
        expect(logs.monthlyPoints.Debbie).toBe(10) // toys + reminder
        expect(champion.monthLabel).toBe('September')
    })

    it('recalculates the previous month crown from shared reminders after a backdated completion', async () => {
        const previous = { ...fixtureReminder, id: 'previous', created_at: new Date(2026, 8, 15).toISOString(), scheduled_at: null, scheduled_by: null, appointment_at: null }
        records.reminders.push(previous)
        await render()
        expect(champion.champion).toBeNull()
        auth.mockImplementation(async () => {
            records.reminders = records.reminders.map(row => row.id === 'previous'
                ? { ...row, completed_at: new Date(2026, 8, 15).toISOString(), completed_by: 'Haydn' }
                : row)
            return { success: true }
        })
        await act(async () => banner.completeReminder('previous', 'Haydn', new Date(2026, 8, 15)))
        expect(champion.champion?.winners).toEqual(['Haydn'])
        expect(logs.monthlyPoints.Haydn).toBe(0)
    })

    it('coalesces foreground signals, reads another device’s updates and locks expired editing access', async () => {
        await render(); await act(async () => history.setSelectedDate(start)); read.mockClear(); auth.mockClear()
        records.logs = []; records.activities = []
        auth.mockResolvedValue({ unlocked: false })
        await foreground()
        expect(logs.todayWalksCount).toBe(0)
        expect(today.isToysFilled).toBe(false)
        expect(history.dayStats?.walksCount).toBe(0)
        expect(analytics.analytics?.walkerStats.Chris.walks).toBe(0)
        expect(access.isUnlocked).toBe(false)
        expect(read.mock.calls.filter(([scope]) => scope.table === 'reminders')).toHaveLength(1)
        expect(auth).toHaveBeenCalledTimes(1)
    })

    it('rolls today, routines, month scores, crown and analytics at midnight without relabeling History', async () => {
        await render(); await act(async () => history.setSelectedDate(start))
        await act(async () => vi.advanceTimersByTimeAsync(10_001))
        expect(logs.hasLoaded).toBe(true)
        expect(logs.todayWalksCount).toBe(0)
        expect(today.isToysFilled).toBe(false)
        expect(logs.monthlyPoints.Chris).toBe(0)
        expect(logs.monthlyPoints.Debbie).toBe(0)
        expect(champion.monthLabel).toBe('October')
        expect(champion.champion?.winners).toContain('Chris')
        expect(history.selectedDate.getDate()).toBe(31)
        expect(history.isToday).toBe(false)
        expect(analytics.analytics?.last30Days.at(-1)?.date.getDate()).toBe(1)
        expect(banner.overdueReminders).toHaveLength(1)
        expect(container.textContent).toContain('Oct 31 at')
        expect(container.textContent).not.toContain('Today at')
    })

    it('rechecks missed midnight on foreground return even when timers were suspended', async () => {
        await render()
        vi.setSystemTime(new Date(2026, 10, 1, 9)) // No timer advancement.
        await foreground()
        expect(logs.todayWalksCount).toBe(0)
        expect(champion.monthLabel).toBe('October')
        expect(today.isToysFilled).toBe(false)
    })

    it('keeps reminders during unavailable foreground reads and lets either consumer recover both', async () => {
        await render()
        read.mockResolvedValue(failure)
        await foreground()
        expect(schedule.reminders).toBe(banner.reminders)
        expect(schedule.reminders[0].id).toBe('reminder')
        expect(schedule.error).toContain('out of date')
        expect(schedule.error).not.toContain('Change saved')
        serve(); read.mockClear()
        await act(async () => Promise.all([schedule.refetch(), banner.refetch()]))
        expect(read).toHaveBeenCalledTimes(1)
        expect(schedule.error).toBeNull()
        expect(banner.error).toBeNull()
    })

    it('cleans up calendar/auth timers and event listeners when the provider unmounts', async () => {
        await render(); await act(async () => root.unmount())
        read.mockClear(); auth.mockClear()
        expect(vi.getTimerCount()).toBe(0)
        await foreground()
        await act(async () => {
            window.dispatchEvent(new Event('ppp:data-changed'))
            window.dispatchEvent(new Event('ppp:reminders-changed'))
            await vi.advanceTimersByTimeAsync(300_000)
        })
        expect(read).not.toHaveBeenCalled(); expect(auth).not.toHaveBeenCalled()
        container = document.createElement('div')
        root = createRoot(container)
    })

    it('rechecks editing access every five visible minutes and rejects a late pre-expiry status', async () => {
        await render()
        const old = deferred<{ unlocked: boolean }>()
        auth.mockReturnValue(old.promise)
        await act(async () => vi.advanceTimersByTimeAsync(300_000))
        await act(async () => window.dispatchEvent(new Event('ppp:write-access-expired')))
        await act(async () => old.resolve({ unlocked: true }))
        expect(access.isUnlocked).toBe(false)
        expect(access.error).toContain('Editing has locked')
    })

    it('ignores superseded reminder responses after a write invalidates an in-flight foreground read', async () => {
        await render()
        const old = deferred<Result>()
        read.mockImplementation((scope: CareQuery) => scope.table === 'reminders' ? old.promise : Promise.resolve(ok()))
        await foreground()
        records.reminders = [{ ...fixtureReminder, scheduled_by: 'Haydn' }]; serve()
        await act(async () => window.dispatchEvent(new Event('ppp:reminders-changed')))
        await act(async () => old.resolve(ok([])))
        expect(banner.activeVetReminder?.scheduled_by).toBe('Haydn')
        expect(schedule.activeVetReminder?.scheduled_by).toBe('Haydn')
    })

    it('isolates exact ranges and timezone scopes while sharing identical cache reads', async () => {
        const store = new CareDataStore()
        const first = { table: 'walks' as const, ...dateRange(start), timezone: 'America/New_York' }
        const second = { ...first, ...dateRange(new Date(2026, 9, 30)) }
        await store.read(first); await store.read(first)
        expect(read).toHaveBeenCalledTimes(1)
        await store.read(second); await store.read({ ...first, timezone: 'America/Chicago' })
        expect(read).toHaveBeenCalledTimes(3)
        expect(store.snapshot(first).data).toHaveLength(1)
        expect(store.snapshot(second).data).toHaveLength(0)
    })

    it('checks precisely at midnight and caps checks to detect clock changes', () => {
        expect(nextCalendarCheck(start)).toBe(10_000)
        expect(nextCalendarCheck(new Date(2026, 9, 31, 12))).toBe(60_000)
    })
})

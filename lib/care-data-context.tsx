'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns'
import { CareDataStore, type CareTable } from './care-data-store'

export function calendarScope(now: Date) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return { now, timezone, key: `${format(now, 'yyyy-MM-dd')}|${timezone}|${now.getTimezoneOffset()}` }
}

export function nextCalendarCheck(now: Date): number {
    // Calendar arithmetic handles 23/25-hour DST days; the cap also detects clock/timezone changes.
    return Math.max(1, Math.min(60_000, startOfDay(addDays(now, 1)).getTime() - now.getTime()))
}

type CareContext = { store: CareDataStore; calendar: ReturnType<typeof calendarScope> }
const Context = createContext<CareContext | null>(null)

export function CareDataProvider({ children }: { children: React.ReactNode }) {
    const [store] = useState(() => new CareDataStore())
    const [calendar, setCalendar] = useState(() => calendarScope(new Date()))

    useEffect(() => {
        let scope = calendarScope(new Date())
        let timer: ReturnType<typeof setTimeout>
        let foregroundTimer: ReturnType<typeof setTimeout> | undefined
        const check = (refresh = false) => {
            const next = calendarScope(new Date())
            const changed = scope.key !== next.key
            scope = next
            if (changed || refresh) {
                setCalendar(next)
                store.invalidate(['walks', 'logs', 'activities', 'reminders'])
            }
        }
        const tick = () => {
            check()
            timer = setTimeout(tick, nextCalendarCheck(new Date()))
        }
        timer = setTimeout(tick, nextCalendarCheck(new Date()))
        const foreground = () => {
            if (document.visibilityState !== 'visible') return
            clearTimeout(foregroundTimer)
            // Coalesce browser focus + visibility + reconnect signals into one refresh.
            foregroundTimer = setTimeout(() => {
                foregroundTimer = undefined
                check(true)
                window.dispatchEvent(new Event('ppp:foreground'))
            }, 50)
        }
        const changed = () => store.invalidate(['walks', 'logs', 'activities'], true)
        const remindersChanged = () => store.invalidate(['reminders'], true)
        window.addEventListener('ppp:data-changed', changed)
        window.addEventListener('ppp:reminders-changed', remindersChanged)
        window.addEventListener('focus', foreground)
        window.addEventListener('online', foreground)
        document.addEventListener('visibilitychange', foreground)
        return () => {
            clearTimeout(timer)
            clearTimeout(foregroundTimer)
            window.removeEventListener('ppp:data-changed', changed)
            window.removeEventListener('ppp:reminders-changed', remindersChanged)
            window.removeEventListener('focus', foreground)
            window.removeEventListener('online', foreground)
            document.removeEventListener('visibilitychange', foreground)
            store.cancel()
        }
    }, [store])

    return <Context.Provider value={useMemo(() => ({ store, calendar }), [store, calendar])}>{children}</Context.Provider>
}

export function useCareCalendar() {
    const context = useContext(Context)
    if (!context) throw new Error('Care hooks require CareDataProvider')
    return context.calendar
}

export function dateRange(date: Date, month = false) {
    return {
        start: (month ? startOfMonth(date) : startOfDay(date)).toISOString(),
        end: (month ? endOfMonth(date) : endOfDay(date)).toISOString(),
    }
}

export function useCareResource<T extends CareTable>(table: T, range: { start?: string; end?: string } = {}) {
    const context = useContext(Context)
    if (!context) throw new Error('Care hooks require CareDataProvider')
    const { store, calendar } = context
    const query = useMemo(() => ({ table, start: range.start, end: range.end, timezone: calendar.timezone }), [table, range.start, range.end, calendar.timezone])
    const subscribe = useCallback((listener: () => void) => store.subscribe(query, listener), [store, query])
    const getSnapshot = useCallback(() => store.snapshot(query), [store, query])
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    useEffect(() => { void store.read(query) }, [store, query])
    const refetch = useCallback(() => store.read(query, true), [store, query])
    return { ...snapshot, isLoading: snapshot.data === null && (snapshot.pending || !snapshot.error), refetch }
}

'use client'

import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { dateRange, useCareCalendar, useCareResource } from '@/lib/care-data-context'
import {
    determineMonthlyChampion,
    recordsToWalks,
    filterRemindersForMonth,
    type MonthlyChampion,
} from '@/lib/domain/metrics'

interface UseMonthlyChampionReturn {
    champion: MonthlyChampion | null
    /** Name of the month that was won, e.g. "May". */
    monthLabel: string
    isLoading: boolean
}

/**
 * Computes last calendar month's winner from the same public Supabase reads the
 * rest of the app uses — no extra table, no month-end job. The crown shown this
 * month celebrates whoever topped the previous month's leaderboard.
 */
export function useMonthlyChampion(): UseMonthlyChampionReturn {
    const { now } = useCareCalendar()
    const monthStart = startOfMonth(subMonths(now, 1))
    const monthEnd = endOfMonth(monthStart)
    const logs = useCareResource('walks', dateRange(monthStart, true))
    const activities = useCareResource('activities', dateRange(monthStart, true))
    const reminders = useCareResource('reminders')
    const ready = logs.data !== null && activities.data !== null && reminders.data !== null
    const champion = ready ? determineMonthlyChampion(logs.data!.flatMap(walk => walk.logs), activities.data!, filterRemindersForMonth(reminders.data!, monthStart, monthEnd), recordsToWalks(logs.data!)) : null
    return { champion, monthLabel: format(monthStart, 'LLLL'), isLoading: logs.pending || activities.pending || reminders.pending }
}

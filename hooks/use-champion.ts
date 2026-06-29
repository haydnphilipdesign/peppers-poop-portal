'use client'

import { useCallback, useEffect, useState } from 'react'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Activity, Log, Reminder } from '@/lib/database.types'
import {
    determineMonthlyChampion,
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
    const [champion, setChampion] = useState<MonthlyChampion | null>(null)
    const [monthLabel, setMonthLabel] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const fetchChampion = useCallback(async () => {
        try {
            setIsLoading(true)

            const monthStart = startOfMonth(subMonths(new Date(), 1))
            const monthEnd = endOfMonth(monthStart)
            setMonthLabel(format(monthStart, 'LLLL'))

            const [logsResult, activitiesResult, remindersResult] = await Promise.all([
                supabase
                    .from('logs')
                    .select('*')
                    .gte('created_at', monthStart.toISOString())
                    .lte('created_at', monthEnd.toISOString()),
                supabase
                    .from('activities')
                    .select('*')
                    .gte('created_at', monthStart.toISOString())
                    .lte('created_at', monthEnd.toISOString()),
                supabase.from('reminders').select('*'),
            ])

            if (logsResult.error) throw logsResult.error
            if (activitiesResult.error) throw activitiesResult.error
            if (remindersResult.error) throw remindersResult.error

            const logs: Log[] = logsResult.data ?? []
            const activities: Activity[] = activitiesResult.data ?? []
            const reminders = filterRemindersForMonth(
                (remindersResult.data as Reminder[]) ?? [],
                monthStart,
                monthEnd
            )

            setChampion(determineMonthlyChampion(logs, activities, reminders))
        } catch {
            // A missing crown is non-critical — fail quiet and show nothing.
            setChampion(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchChampion()
    }, [fetchChampion])

    useEffect(() => {
        const handler = () => {
            void fetchChampion()
        }

        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
        }
    }, [fetchChampion])

    return { champion, monthLabel, isLoading }
}

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Log, UserName } from '@/lib/database.types'
import { endOfDay, format, startOfDay, subDays, eachDayOfInterval } from 'date-fns'
import {
    calculateTimeOfDayDistribution,
    calculateWalkerStats,
    groupLogsIntoWalks,
    type Walk,
} from '@/lib/domain/metrics'

export interface DayStats {
    date: Date
    dateFormatted: string
    poopCount: number
    peeCount: number
    walksCount: number
    walks: Walk[]
}

export interface AnalyticsData {
    last7Days: DayStats[]
    last30Days: DayStats[]
    walkerStats: Record<UserName, { walks: number; poops: number; pees: number }>
    bestStreak: number
    averageWalksPerDay: number
    averagePoopsPerDay: number
    timeOfDayDistribution: {
        morning: number
        afternoon: number
        evening: number
        night: number
    }
}

interface UseHistoryReturn {
    selectedDate: Date
    setSelectedDate: (date: Date) => void
    dayStats: DayStats | null
    isLoading: boolean
    error: string | null
    goToPreviousDay: () => void
    goToNextDay: () => void
    goToToday: () => void
    isToday: boolean
}

interface UseAnalyticsReturn {
    analytics: AnalyticsData | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

function calculateBestStreak(days: DayStats[]): number {
    let bestStreak = 0
    let currentStreak = 0

    days.forEach(day => {
        if (day.poopCount >= 3) {
            currentStreak += 1
            bestStreak = Math.max(bestStreak, currentStreak)
        } else {
            currentStreak = 0
        }
    })

    return bestStreak
}

export function useHistory(): UseHistoryReturn {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [logs, setLogs] = useState<Log[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogsForDate = useCallback(async (date: Date) => {
        try {
            setIsLoading(true)
            setError(null)

            const dayStart = startOfDay(date)
            const dayEnd = endOfDay(date)

            const { data, error: fetchError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', dayStart.toISOString())
                .lte('created_at', dayEnd.toISOString())
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError

            setLogs(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch logs')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchLogsForDate(selectedDate)
    }, [selectedDate, fetchLogsForDate])

    const dayStats = useMemo((): DayStats | null => {
        const walks = groupLogsIntoWalks(logs)
        return {
            date: selectedDate,
            dateFormatted: format(selectedDate, 'EEEE, MMMM d'),
            poopCount: logs.filter(log => log.type === 'poop').length,
            peeCount: logs.filter(log => log.type === 'pee').length,
            walksCount: walks.length,
            walks,
        }
    }, [logs, selectedDate])

    const isToday = useMemo(() => {
        const today = new Date()
        return (
            selectedDate.getDate() === today.getDate() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getFullYear() === today.getFullYear()
        )
    }, [selectedDate])

    const goToPreviousDay = useCallback(() => {
        setSelectedDate(prev => subDays(prev, 1))
    }, [])

    const goToNextDay = useCallback(() => {
        if (!isToday) {
            setSelectedDate(prev => {
                const next = new Date(prev)
                next.setDate(next.getDate() + 1)
                return next
            })
        }
    }, [isToday])

    const goToToday = useCallback(() => {
        setSelectedDate(new Date())
    }, [])

    return {
        selectedDate,
        setSelectedDate,
        dayStats,
        isLoading,
        error,
        goToPreviousDay,
        goToNextDay,
        goToToday,
        isToday,
    }
}

export function useAnalytics(): UseAnalyticsReturn {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnalytics = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            const now = new Date()
            const thirtyDaysAgo = subDays(now, 30)

            const { data, error: fetchError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', startOfDay(thirtyDaysAgo).toISOString())
                .lte('created_at', endOfDay(now).toISOString())
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError

            const logs: Log[] = (data || []) as Log[]
            const intervalDays = eachDayOfInterval({
                start: startOfDay(thirtyDaysAgo),
                end: startOfDay(now),
            })

            const dailyStats: DayStats[] = intervalDays.map(date => {
                const dayStart = startOfDay(date)
                const dayEnd = endOfDay(date)
                const dayLogs = logs.filter(log => {
                    const logDate = new Date(log.created_at)
                    return logDate >= dayStart && logDate <= dayEnd
                })
                const walks = groupLogsIntoWalks(dayLogs)

                return {
                    date,
                    dateFormatted: format(date, 'EEE'),
                    poopCount: dayLogs.filter(log => log.type === 'poop').length,
                    peeCount: dayLogs.filter(log => log.type === 'pee').length,
                    walksCount: walks.length,
                    walks,
                }
            })

            const allWalks = dailyStats.flatMap(day => day.walks)
            const walkerStats = calculateWalkerStats(logs, allWalks)

            const totalDays = dailyStats.length || 1
            const averageWalksPerDay =
                dailyStats.reduce((sum, day) => sum + day.walksCount, 0) / totalDays
            const averagePoopsPerDay =
                dailyStats.reduce((sum, day) => sum + day.poopCount, 0) / totalDays

            setAnalytics({
                last7Days: dailyStats.slice(-7),
                last30Days: dailyStats,
                walkerStats,
                bestStreak: calculateBestStreak(dailyStats),
                averageWalksPerDay,
                averagePoopsPerDay,
                timeOfDayDistribution: calculateTimeOfDayDistribution(logs),
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchAnalytics()
    }, [fetchAnalytics])

    useEffect(() => {
        const handler = () => {
            void fetchAnalytics()
        }

        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
        }
    }, [fetchAnalytics])

    return {
        analytics,
        isLoading,
        error,
        refetch: fetchAnalytics,
    }
}

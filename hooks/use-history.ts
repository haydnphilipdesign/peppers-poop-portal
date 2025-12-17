'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Log, UserName } from '@/lib/database.types'
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns'

// A walk is a group of logs within 30 minutes of each other
export interface Walk {
    id: string
    time: Date
    timeFormatted: string
    userName: UserName
    hasPoop: boolean
    hasPee: boolean
    logs: Log[]
}

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
        morning: number    // 5am-12pm
        afternoon: number  // 12pm-5pm
        evening: number    // 5pm-9pm
        night: number      // 9pm-5am
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

// Helper to create a Walk object from a group of logs
function createWalkFromLogs(logs: Log[]): Walk {
    const firstLog = logs[0]
    const walkTime = new Date(firstLog.created_at)

    return {
        id: `walk-${firstLog.id}`,
        time: walkTime,
        timeFormatted: format(walkTime, 'h:mm a'),
        userName: firstLog.user_name,
        hasPoop: logs.some(log => log.type === 'poop'),
        hasPee: logs.some(log => log.type === 'pee'),
        logs,
    }
}

// Group logs into walks (within 30 minutes)
function groupLogsIntoWalks(logs: Log[]): Walk[] {
    if (logs.length === 0) return []

    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const walks: Walk[] = []
    let currentWalk: Log[] = [sortedLogs[0]]

    for (let i = 1; i < sortedLogs.length; i++) {
        const prevLogTime = new Date(sortedLogs[i - 1].created_at).getTime()
        const currentLogTime = new Date(sortedLogs[i].created_at).getTime()
        const diffMinutes = (currentLogTime - prevLogTime) / (1000 * 60)

        if (diffMinutes <= 30) {
            currentWalk.push(sortedLogs[i])
        } else {
            walks.push(createWalkFromLogs(currentWalk))
            currentWalk = [sortedLogs[i]]
        }
    }

    walks.push(createWalkFromLogs(currentWalk))
    return walks
}

// Hook for viewing a specific day's history
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
        fetchLogsForDate(selectedDate)
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

// Hook for analytics data
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
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError

            const logs: Log[] = (data || []) as Log[]

            // Calculate stats for each day
            const last30DaysInterval = eachDayOfInterval({
                start: thirtyDaysAgo,
                end: now,
            })

            const dailyStats: DayStats[] = last30DaysInterval.map(date => {
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

            // Walker stats
            const walkerStats: Record<UserName, { walks: number; poops: number; pees: number }> = {
                Chris: { walks: 0, poops: 0, pees: 0 },
                Debbie: { walks: 0, poops: 0, pees: 0 },
                Haydn: { walks: 0, poops: 0, pees: 0 },
            }

            logs.forEach(log => {
                if (log.type === 'poop') walkerStats[log.user_name].poops++
                if (log.type === 'pee') walkerStats[log.user_name].pees++
            })

            // Count walks per user
            dailyStats.forEach(day => {
                day.walks.forEach(walk => {
                    walkerStats[walk.userName].walks++
                })
            })

            // Calculate best streak (consecutive days with 3+ poops)
            let bestStreak = 0
            let currentStreak = 0
            for (const day of dailyStats) {
                if (day.poopCount >= 3) {
                    currentStreak++
                    bestStreak = Math.max(bestStreak, currentStreak)
                } else {
                    currentStreak = 0
                }
            }

            // Average walks per day (excluding days with 0 walks)
            const daysWithWalks = dailyStats.filter(d => d.walksCount > 0)
            const averageWalksPerDay = daysWithWalks.length > 0
                ? daysWithWalks.reduce((sum, d) => sum + d.walksCount, 0) / daysWithWalks.length
                : 0

            // Average poops per day
            const daysWithPoops = dailyStats.filter(d => d.poopCount > 0)
            const averagePoopsPerDay = daysWithPoops.length > 0
                ? daysWithPoops.reduce((sum, d) => sum + d.poopCount, 0) / daysWithPoops.length
                : 0

            // Time of day distribution
            const timeOfDayDistribution = {
                morning: 0,
                afternoon: 0,
                evening: 0,
                night: 0,
            }

            logs.forEach(log => {
                const hour = new Date(log.created_at).getHours()
                if (hour >= 5 && hour < 12) timeOfDayDistribution.morning++
                else if (hour >= 12 && hour < 17) timeOfDayDistribution.afternoon++
                else if (hour >= 17 && hour < 21) timeOfDayDistribution.evening++
                else timeOfDayDistribution.night++
            })

            setAnalytics({
                last7Days: dailyStats.slice(-7),
                last30Days: dailyStats,
                walkerStats,
                bestStreak,
                averageWalksPerDay,
                averagePoopsPerDay,
                timeOfDayDistribution,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    return {
        analytics,
        isLoading,
        error,
        refetch: fetchAnalytics,
    }
}

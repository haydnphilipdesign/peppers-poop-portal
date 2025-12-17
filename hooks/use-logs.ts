'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Log, LogType, UserName } from '@/lib/database.types'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, isSameDay } from 'date-fns'

interface UseLogsReturn {
    todayLogs: Log[]
    weeklyLogs: Log[]
    isLoading: boolean
    error: string | null
    addLog: (type: LogType, userName: UserName, createdAt?: Date) => Promise<void>
    refetch: () => Promise<void>
    todayPoopCount: number
    todayPeeCount: number
    todayWalksCount: number
    streak: number
    weeklyPoints: Record<UserName, number>
}

export function useLogs(): UseLogsReturn {
    const [todayLogs, setTodayLogs] = useState<Log[]>([])
    const [weeklyLogs, setWeeklyLogs] = useState<Log[]>([])
    const [allLogs, setAllLogs] = useState<Log[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true)
            const now = new Date()
            const todayStart = startOfDay(now)
            const todayEnd = endOfDay(now)
            const weekStart = startOfWeek(now, { weekStartsOn: 0 })
            const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

            // Fetch today's logs
            const { data: todayData, error: todayError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString())
                .order('created_at', { ascending: false })

            if (todayError) throw todayError

            // Fetch this week's logs
            const { data: weekData, error: weekError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', weekStart.toISOString())
                .lte('created_at', weekEnd.toISOString())
                .order('created_at', { ascending: false })

            if (weekError) throw weekError

            // Fetch all logs for streak calculation (last 30 days should be enough)
            const thirtyDaysAgo = subDays(now, 30)
            const { data: allData, error: allError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false })

            if (allError) throw allError

            setTodayLogs(todayData || [])
            setWeeklyLogs(weekData || [])
            setAllLogs(allData || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch logs')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const addLog = async (type: LogType, userName: UserName, createdAt?: Date) => {
        const timestamp = createdAt || new Date()

        // Optimistic update
        const optimisticLog: Log = {
            id: `temp-${Date.now()}`,
            created_at: timestamp.toISOString(),
            type,
            user_name: userName,
            notes: null,
        }

        // Check if this log is for today
        const isToday = isSameDay(timestamp, new Date())

        if (isToday) {
            setTodayLogs(prev => [optimisticLog, ...prev])
        }
        setWeeklyLogs(prev => [optimisticLog, ...prev])
        setAllLogs(prev => [optimisticLog, ...prev])

        try {
            const { error } = await supabase
                .from('logs')
                .insert({
                    created_at: timestamp.toISOString(),
                    type,
                    user_name: userName,
                    notes: null,
                } as never)

            if (error) {
                console.error('Supabase insert error:', error)
                throw new Error(`${error.message} (Code: ${error.code}, Details: ${error.details})`)
            }

            // Refetch to get the real data
            await fetchLogs()
        } catch (err) {
            // Rollback optimistic update
            if (isToday) {
                setTodayLogs(prev => prev.filter(log => log.id !== optimisticLog.id))
            }
            setWeeklyLogs(prev => prev.filter(log => log.id !== optimisticLog.id))
            setAllLogs(prev => prev.filter(log => log.id !== optimisticLog.id))
            const errorMessage = err instanceof Error ? err.message : 'Failed to add log'
            console.error('Add log error:', errorMessage)
            setError(errorMessage)
        }
    }

    // Calculate today's counts
    const todayPoopCount = todayLogs.filter(log => log.type === 'poop').length
    const todayPeeCount = todayLogs.filter(log => log.type === 'pee').length

    // Calculate streak (consecutive days with 3+ poops)
    const calculateStreak = (): number => {
        if (allLogs.length === 0) return 0

        let streak = 0
        let currentDate = new Date()

        // Check if today has 3+ poops, if not start from yesterday
        const todayPoops = allLogs.filter(
            log => log.type === 'poop' && isSameDay(new Date(log.created_at), currentDate)
        ).length

        if (todayPoops < 3) {
            currentDate = subDays(currentDate, 1)
        }

        while (true) {
            const dayPoops = allLogs.filter(
                log => log.type === 'poop' && isSameDay(new Date(log.created_at), currentDate)
            ).length

            if (dayPoops >= 3) {
                streak++
                currentDate = subDays(currentDate, 1)
            } else {
                break
            }
        }

        return streak
    }

    // Calculate weekly points per user
    const weeklyPoints: Record<UserName, number> = {
        Chris: 0,
        Debbie: 0,
        Haydn: 0,
    }

    weeklyLogs.forEach(log => {
        const points = log.type === 'poop' ? 10 : 5
        weeklyPoints[log.user_name] += points
    })

    // Calculate today's walks (group logs within 30 minutes as same walk)
    const calculateWalks = (): number => {
        if (todayLogs.length === 0) return 0

        // Sort by time ascending
        const sortedLogs = [...todayLogs].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        let walks = 1
        let lastLogTime = new Date(sortedLogs[0].created_at).getTime()

        for (let i = 1; i < sortedLogs.length; i++) {
            const currentLogTime = new Date(sortedLogs[i].created_at).getTime()
            const diffMinutes = (currentLogTime - lastLogTime) / (1000 * 60)

            // If more than 30 minutes apart, it's a new walk
            if (diffMinutes > 30) {
                walks++
            }
            lastLogTime = currentLogTime
        }

        return walks
    }

    const todayWalksCount = calculateWalks()

    return {
        todayLogs,
        weeklyLogs,
        isLoading,
        error,
        addLog,
        refetch: fetchLogs,
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        streak: calculateStreak(),
        weeklyPoints,
    }
}

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Log, LogType, UserName, Activity } from '@/lib/database.types'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, isSameDay, format } from 'date-fns'

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

interface UseLogsReturn {
    todayLogs: Log[]
    weeklyLogs: Log[]
    todayWalks: Walk[]
    isLoading: boolean
    error: string | null
    addLog: (type: LogType, userName: UserName, createdAt?: Date) => Promise<void>
    addWalk: (options: { poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => Promise<void>
    deleteWalk: (walk: Walk) => Promise<void>
    updateWalk: (walk: Walk, updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }) => Promise<void>
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
    const [weeklyActivities, setWeeklyActivities] = useState<Activity[]>([])
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

            // Fetch this week's activities for points
            const { data: weekActivitiesData, error: weekActivitiesError } = await supabase
                .from('activities')
                .select('*')
                .gte('created_at', weekStart.toISOString())
                .lte('created_at', weekEnd.toISOString())

            if (weekActivitiesError) throw weekActivitiesError

            setTodayLogs(todayData || [])
            setWeeklyLogs(weekData || [])
            setWeeklyActivities(weekActivitiesData || [])
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

    // Add a walk with poop and/or pee at the same time
    const addWalk = async (options: { poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => {
        const { poop, pee, userName, createdAt } = options
        const timestamp = createdAt || new Date()

        // Add both logs with the same timestamp if needed
        const logsToAdd: LogType[] = []
        if (poop) logsToAdd.push('poop')
        if (pee) logsToAdd.push('pee')

        // Add logs sequentially with same timestamp
        for (const type of logsToAdd) {
            await addLog(type, userName, timestamp)
        }
    }

    // Delete a walk (removes all associated logs)
    const deleteWalk = async (walk: Walk) => {
        try {
            const logIds = walk.logs.map(log => log.id)

            // Optimistic update - remove from state immediately
            setTodayLogs(prev => prev.filter(log => !logIds.includes(log.id)))
            setWeeklyLogs(prev => prev.filter(log => !logIds.includes(log.id)))
            setAllLogs(prev => prev.filter(log => !logIds.includes(log.id)))

            // Delete from database
            const { error } = await supabase
                .from('logs')
                .delete()
                .in('id', logIds)

            if (error) throw error

            // Refetch to ensure consistency
            await fetchLogs()
        } catch (err) {
            // Rollback on error by refetching
            await fetchLogs()
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete walk'
            setError(errorMessage)
        }
    }

    // Update a walk (modify walker, time, poop/pee status)
    const updateWalk = async (
        walk: Walk,
        updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }
    ) => {
        try {
            const logIds = walk.logs.map(log => log.id)

            // Delete existing logs
            const { error: deleteError } = await supabase
                .from('logs')
                .delete()
                .in('id', logIds)

            if (deleteError) throw deleteError

            // Create new logs with updated values
            const logsToAdd: LogType[] = []
            if (updates.poop) logsToAdd.push('poop')
            if (updates.pee) logsToAdd.push('pee')

            for (const type of logsToAdd) {
                const { error: insertError } = await supabase
                    .from('logs')
                    .insert({
                        created_at: updates.time.toISOString(),
                        type,
                        user_name: updates.userName,
                        notes: null,
                    } as never)

                if (insertError) throw insertError
            }

            // Refetch to get fresh data
            await fetchLogs()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update walk'
            setError(errorMessage)
            await fetchLogs() // Ensure we have consistent state
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

    // Calculate weekly points per user (logs + activities)
    const weeklyPoints: Record<UserName, number> = {
        Chris: 0,
        Debbie: 0,
        Haydn: 0,
    }

    // Add points from walk logs
    weeklyLogs.forEach(log => {
        const points = log.type === 'poop' ? 10 : 5
        weeklyPoints[log.user_name] += points
    })

    // Add points from activities (assigned_to gets the points)
    weeklyActivities.forEach(activity => {
        const points = 5 // toys and dinner are 5 points each
        weeklyPoints[activity.assigned_to] += points
    })

    // Calculate today's walks (group logs within 30 minutes as same walk)
    const todayWalks = useMemo((): Walk[] => {
        if (todayLogs.length === 0) return []

        // Sort by time ascending
        const sortedLogs = [...todayLogs].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        const walks: Walk[] = []
        let currentWalk: Log[] = [sortedLogs[0]]

        for (let i = 1; i < sortedLogs.length; i++) {
            const prevLogTime = new Date(sortedLogs[i - 1].created_at).getTime()
            const currentLogTime = new Date(sortedLogs[i].created_at).getTime()
            const diffMinutes = (currentLogTime - prevLogTime) / (1000 * 60)

            if (diffMinutes <= 30) {
                // Same walk
                currentWalk.push(sortedLogs[i])
            } else {
                // New walk - save current and start new
                walks.push(createWalkFromLogs(currentWalk))
                currentWalk = [sortedLogs[i]]
            }
        }

        // Don't forget the last walk
        walks.push(createWalkFromLogs(currentWalk))

        // Return in chronological order (oldest first, newest at bottom)
        return walks
    }, [todayLogs])

    const todayWalksCount = todayWalks.length

    return {
        todayLogs,
        weeklyLogs,
        todayWalks,
        isLoading,
        error,
        addLog,
        addWalk,
        deleteWalk,
        updateWalk,
        refetch: fetchLogs,
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        streak: calculateStreak(),
        weeklyPoints,
    }
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

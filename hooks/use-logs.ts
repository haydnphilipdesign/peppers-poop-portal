'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type { ApiSuccessResponse, WalkCreateRequest, WalkDeleteRequest, WalkUpdateRequest } from '@/lib/api-types'
import type { Log, LogType, UserName, Activity, Reminder } from '@/lib/database.types'
import {
    calculatePoopStreak,
    calculateWeeklyPoints,
    getLatestWalkFromLogs,
    groupLogsIntoWalks,
    type Walk,
} from '@/lib/domain/metrics'
import { endOfDay, endOfWeek, startOfDay, startOfWeek, subDays } from 'date-fns'

interface UseLogsReturn {
    todayLogs: Log[]
    weeklyLogs: Log[]
    todayWalks: Walk[]
    latestWalk: Walk | null
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
    const [weeklyReminders, setWeeklyReminders] = useState<Reminder[]>([])
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

            const { data: todayData, error: todayError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString())
                .order('created_at', { ascending: false })

            if (todayError) throw todayError

            const { data: weekData, error: weekError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', weekStart.toISOString())
                .lte('created_at', weekEnd.toISOString())
                .order('created_at', { ascending: false })

            if (weekError) throw weekError

            const thirtyDaysAgo = subDays(now, 30)
            const { data: allData, error: allError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false })

            if (allError) throw allError

            const { data: weekActivitiesData, error: weekActivitiesError } = await supabase
                .from('activities')
                .select('*')
                .gte('created_at', weekStart.toISOString())
                .lte('created_at', weekEnd.toISOString())

            if (weekActivitiesError) throw weekActivitiesError

            const { data: weekRemindersData, error: weekRemindersError } = await supabase
                .from('reminders')
                .select('*')
                .not('completed_at', 'is', null)
                .gte('completed_at', weekStart.toISOString())
                .lte('completed_at', weekEnd.toISOString())

            if (weekRemindersError) throw weekRemindersError

            setTodayLogs(todayData || [])
            setWeeklyLogs(weekData || [])
            setWeeklyActivities(weekActivitiesData || [])
            setWeeklyReminders(weekRemindersData || [])
            setAllLogs(allData || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch logs')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchLogs()
    }, [fetchLogs])

    useEffect(() => {
        const handler = () => {
            void fetchLogs()
        }

        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
        }
    }, [fetchLogs])

    const addWalk = async (options: { poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => {
        try {
            await apiFetch<ApiSuccessResponse>('/api/walks', {
                method: 'POST',
                body: JSON.stringify({
                    poop: options.poop,
                    pee: options.pee,
                    userName: options.userName,
                    createdAt: options.createdAt?.toISOString(),
                } satisfies WalkCreateRequest),
            })

            await fetchLogs()
            window.dispatchEvent(new Event('ppp:data-changed'))
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add walk')
        }
    }

    const addLog = async (type: LogType, userName: UserName, createdAt?: Date) => {
        await addWalk({
            poop: type === 'poop',
            pee: type === 'pee',
            userName,
            createdAt,
        })
    }

    const deleteWalk = async (walk: Walk) => {
        try {
            await apiFetch<ApiSuccessResponse>('/api/walks', {
                method: 'DELETE',
                body: JSON.stringify({
                    logIds: walk.logs.map(log => log.id),
                } satisfies WalkDeleteRequest),
            })

            await fetchLogs()
            window.dispatchEvent(new Event('ppp:data-changed'))
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete walk')
        }
    }

    const updateWalk = async (
        walk: Walk,
        updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }
    ) => {
        try {
            await apiFetch<ApiSuccessResponse>('/api/walks', {
                method: 'PATCH',
                body: JSON.stringify({
                    logIds: walk.logs.map(log => log.id),
                    poop: updates.poop,
                    pee: updates.pee,
                    userName: updates.userName,
                    createdAt: updates.time.toISOString(),
                } satisfies WalkUpdateRequest),
            })

            await fetchLogs()
            window.dispatchEvent(new Event('ppp:data-changed'))
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update walk')
        }
    }

    const todayPoopCount = useMemo(
        () => todayLogs.filter(log => log.type === 'poop').length,
        [todayLogs]
    )
    const todayPeeCount = useMemo(
        () => todayLogs.filter(log => log.type === 'pee').length,
        [todayLogs]
    )

    const todayWalks = useMemo(() => groupLogsIntoWalks(todayLogs), [todayLogs])
    const latestWalk = useMemo(() => getLatestWalkFromLogs(allLogs), [allLogs])

    const todayWalksCount = todayWalks.length
    const weeklyPoints = useMemo(
        () => calculateWeeklyPoints(weeklyLogs, weeklyActivities, weeklyReminders),
        [weeklyActivities, weeklyLogs, weeklyReminders]
    )

    const streak = useMemo(() => calculatePoopStreak(allLogs), [allLogs])

    return {
        todayLogs,
        weeklyLogs,
        todayWalks,
        latestWalk,
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
        streak,
        weeklyPoints,
    }
}

export type { Walk }

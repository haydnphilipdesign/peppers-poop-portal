'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type { ApiSuccessResponse, WalkCreateRequest, WalkDeleteRequest, WalkUpdateRequest } from '@/lib/api-types'
import type { Log, LogType, UserName, Activity, Reminder } from '@/lib/database.types'
import {
    calculatePoopStreak,
    calculateMonthlyPoints,
    getLatestWalkFromLogs,
    groupLogsIntoWalks,
    type Walk,
} from '@/lib/domain/metrics'
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns'

interface UseLogsReturn {
    todayLogs: Log[]
    monthlyLogs: Log[]
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
    monthlyPoints: Record<UserName, number>
}

export function useLogs(): UseLogsReturn {
    const [todayLogs, setTodayLogs] = useState<Log[]>([])
    const [monthlyLogs, setMonthlyLogs] = useState<Log[]>([])
    const [monthlyActivities, setMonthlyActivities] = useState<Activity[]>([])
    const [monthlyReminders, setMonthlyReminders] = useState<Reminder[]>([])
    const [allLogs, setAllLogs] = useState<Log[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true)
            const now = new Date()
            const todayStart = startOfDay(now)
            const todayEnd = endOfDay(now)
            const monthStart = startOfMonth(now)
            const monthEnd = endOfMonth(now)

            const { data: todayData, error: todayError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString())
                .order('created_at', { ascending: false })

            if (todayError) throw todayError

            const { data: monthData, error: monthError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', monthStart.toISOString())
                .lte('created_at', monthEnd.toISOString())
                .order('created_at', { ascending: false })

            if (monthError) throw monthError

            const thirtyDaysAgo = subDays(now, 30)
            const { data: allData, error: allError } = await supabase
                .from('logs')
                .select('*')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false })

            if (allError) throw allError

            const { data: monthActivitiesData, error: monthActivitiesError } = await supabase
                .from('activities')
                .select('*')
                .gte('created_at', monthStart.toISOString())
                .lte('created_at', monthEnd.toISOString())

            if (monthActivitiesError) throw monthActivitiesError

            const { data: allRemindersData, error: monthRemindersError } = await supabase
                .from('reminders')
                .select('*')

            if (monthRemindersError) throw monthRemindersError

            const remindersData: Reminder[] = allRemindersData ?? []
            const monthStartTime = monthStart.getTime()
            const monthEndTime = monthEnd.getTime()

            const monthRemindersData = remindersData.filter(reminder => {
                const scheduledAt = reminder.scheduled_at ? new Date(reminder.scheduled_at).getTime() : null
                const completedAt = reminder.completed_at ? new Date(reminder.completed_at).getTime() : null

                const hasScheduledPoints = scheduledAt !== null &&
                    scheduledAt >= monthStartTime &&
                    scheduledAt <= monthEndTime

                const hasCompletedPoints = completedAt !== null &&
                    completedAt >= monthStartTime &&
                    completedAt <= monthEndTime

                return hasScheduledPoints || hasCompletedPoints
            })

            setTodayLogs(todayData || [])
            setMonthlyLogs(monthData || [])
            setMonthlyActivities(monthActivitiesData || [])
            setMonthlyReminders(monthRemindersData || [])
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
    const monthlyPoints = useMemo(
        () => calculateMonthlyPoints(monthlyLogs, monthlyActivities, monthlyReminders),
        [monthlyActivities, monthlyLogs, monthlyReminders]
    )

    const streak = useMemo(() => calculatePoopStreak(allLogs), [allLogs])

    return {
        todayLogs,
        monthlyLogs,
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
        monthlyPoints,
    }
}

export type { Walk }

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type { ApiSuccessResponse, WalkCreateRequest, WalkDeleteRequest, WalkUpdateRequest } from '@/lib/api-types'
import type { Log, LogType, UserName, Activity, Reminder } from '@/lib/database.types'
import {
    calculatePoopStreak,
    calculateMonthlyPoints,
    filterRemindersForMonth,
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
    isRefreshing: boolean
    hasLoaded: boolean
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
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const loaded = useRef(false)
    const requestId = useRef(0)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = useCallback(async () => {
        const id = ++requestId.current
        try {
            setIsLoading(!loaded.current)
            setIsRefreshing(loaded.current)
            const now = new Date()
            const todayStart = startOfDay(now)
            const todayEnd = endOfDay(now)
            const monthStart = startOfMonth(now)
            const monthEnd = endOfMonth(now)

            const thirtyDaysAgo = subDays(now, 30)
            // These reads do not depend on one another. Start them together.
            const [todayResult, monthResult, allResult, activitiesResult, remindersResult] = await Promise.all([
                supabase
                    .from('logs')
                    .select('*')
                    .gte('created_at', todayStart.toISOString())
                    .lte('created_at', todayEnd.toISOString())
                    .order('created_at', { ascending: false }),
                supabase
                    .from('logs')
                    .select('*')
                    .gte('created_at', monthStart.toISOString())
                    .lte('created_at', monthEnd.toISOString())
                    .order('created_at', { ascending: false }),
                supabase
                    .from('logs')
                    .select('*')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .order('created_at', { ascending: false }),
                supabase
                    .from('activities')
                    .select('*')
                    .gte('created_at', monthStart.toISOString())
                    .lte('created_at', monthEnd.toISOString()),
                supabase
                    .from('reminders')
                    .select('*'),
            ])
            if (id !== requestId.current) return
            for (const result of [todayResult, monthResult, allResult, activitiesResult, remindersResult]) {
                if (result.error) throw result.error
            }

            const remindersData: Reminder[] = remindersResult.data ?? []
            const monthRemindersData = filterRemindersForMonth(remindersData, monthStart, monthEnd)

            setTodayLogs(todayResult.data || [])
            setMonthlyLogs(monthResult.data || [])
            setMonthlyActivities(activitiesResult.data || [])
            setMonthlyReminders(monthRemindersData || [])
            setAllLogs(allResult.data || [])
            loaded.current = true
            setHasLoaded(true)
            setError(null)
        } catch (err) {
            if (id === requestId.current) {
                // PostgREST errors are plain objects rather than Error instances.
                const message = err && typeof err === 'object' && 'message' in err
                    ? String(err.message) : 'Unable to load care data.'
                setError(message)
            }
        } finally {
            if (id === requestId.current) {
                setIsLoading(false)
                setIsRefreshing(false)
            }
        }
    }, [])

    useEffect(() => {
        void fetchLogs()
        const handler = () => {
            void fetchLogs()
        }

        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
            requestId.current += 1
        }
    }, [fetchLogs])

    const addWalk = async (options: { poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => {
        await apiFetch<ApiSuccessResponse>('/api/walks', {
            method: 'POST',
            body: JSON.stringify({
                poop: options.poop,
                pee: options.pee,
                userName: options.userName,
                createdAt: options.createdAt?.toISOString(),
            } satisfies WalkCreateRequest),
        })

        // The event refreshes this hook and other care sections once. Saving
        // succeeds when the write succeeds, independently of subsequent reads.
        window.dispatchEvent(new Event('ppp:data-changed'))
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
        await apiFetch<ApiSuccessResponse>('/api/walks', {
            method: 'DELETE',
            body: JSON.stringify({
                logIds: walk.logs.map(log => log.id),
            } satisfies WalkDeleteRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }

    const updateWalk = async (
        walk: Walk,
        updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }
    ) => {
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

        window.dispatchEvent(new Event('ppp:data-changed'))
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
        isRefreshing,
        hasLoaded,
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

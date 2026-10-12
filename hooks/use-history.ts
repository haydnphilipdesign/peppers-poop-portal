'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type {
    ActivityCreateRequest,
    ActivityDeleteRequest,
    ActivityUpdateRequest,
    ApiSuccessResponse,
    WalkCreateRequest,
    WalkDeleteRequest,
    WalkUpdateRequest
} from '@/lib/api-types'
import { getRoutineStatus, type RoutineStatus } from '@/lib/activity-utils'
import type { Activity, Log, UserName } from '@/lib/database.types'
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
    dayActivities: Activity[]
    toysStatus: RoutineStatus
    dinnerStatus: RoutineStatus
    isLoading: boolean
    isRefreshing: boolean
    error: string | null
    goToPreviousDay: () => void
    goToNextDay: () => void
    isToday: boolean
    addWalk: (options: { poop: boolean; pee: boolean; userName: UserName; createdAt: Date }) => Promise<void>
    updateWalk: (walk: Walk, updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }) => Promise<void>
    deleteWalk: (walk: Walk) => Promise<void>
    logActivity: (type: RoutineStatus['type'], loggedBy: UserName, assignedTo: UserName, createdAt: Date) => Promise<void>
    updateActivity: (id: string, loggedBy: UserName, assignedTo: UserName, createdAt: Date) => Promise<void>
    deleteActivity: (id: string) => Promise<void>
    refetch: () => Promise<void>
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
    const [selectedDate, setSelectedDate] = useState<Date>(() => subDays(new Date(), 1))
    const [logs, setLogs] = useState<Log[]>([])
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const requestId = useRef(0)
    const [dataDate, setDataDate] = useState<string | null>(null)
    const dateKey = format(selectedDate, 'yyyy-MM-dd')

    const fetchDayData = useCallback(async (date: Date, afterSave = false) => {
        const id = ++requestId.current
        try {
            setIsLoading(true)
            setError(null)

            const dayStart = startOfDay(date)
            const dayEnd = endOfDay(date)

            const [logsResult, activitiesResult] = await Promise.all([
                supabase
                    .from('logs')
                    .select('*')
                    .gte('created_at', dayStart.toISOString())
                    .lte('created_at', dayEnd.toISOString())
                    .order('created_at', { ascending: false }),
                supabase
                    .from('activities')
                    .select('*')
                    .gte('created_at', dayStart.toISOString())
                    .lte('created_at', dayEnd.toISOString())
                    .order('created_at', { ascending: false }),
            ])

            if (logsResult.error) throw logsResult.error
            if (activitiesResult.error) throw activitiesResult.error

            if (id !== requestId.current) return
            setDataDate(format(date, 'yyyy-MM-dd'))
            setLogs(logsResult.data || [])
            setActivities(activitiesResult.data || [])
        } catch {
            if (id === requestId.current) {
                setError(afterSave
                    ? 'Change saved, but history could not refresh. Refresh history; do not save again.'
                    : 'History could not be checked. Displayed records may be out of date. Please refresh history.')
            }
        } finally {
            if (id === requestId.current) setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchDayData(selectedDate)
        return () => { requestId.current += 1 }
    }, [selectedDate, fetchDayData])

    useEffect(() => {
        const handler = () => {
            void fetchDayData(selectedDate, true)
        }

        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
        }
    }, [fetchDayData, selectedDate])

    const dayStats = useMemo((): DayStats | null => {
        if (dataDate !== dateKey) return null
        const walks = groupLogsIntoWalks(logs)
        return {
            date: selectedDate,
            dateFormatted: format(selectedDate, 'EEEE, MMMM d'),
            poopCount: logs.filter(log => log.type === 'poop').length,
            peeCount: logs.filter(log => log.type === 'pee').length,
            walksCount: walks.length,
            walks,
        }
    }, [logs, selectedDate, dataDate, dateKey])

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

    const refetch = useCallback(async () => {
        await fetchDayData(selectedDate)
    }, [fetchDayData, selectedDate])

    const addWalk = useCallback(async (options: { poop: boolean; pee: boolean; userName: UserName; createdAt: Date }) => {
        await apiFetch<ApiSuccessResponse>('/api/walks', {
            method: 'POST',
            body: JSON.stringify({
                poop: options.poop,
                pee: options.pee,
                userName: options.userName,
                createdAt: options.createdAt.toISOString(),
            } satisfies WalkCreateRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }, [])

    const updateWalk = useCallback(async (
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
    }, [])

    const deleteWalk = useCallback(async (walk: Walk) => {
        await apiFetch<ApiSuccessResponse>('/api/walks', {
            method: 'DELETE',
            body: JSON.stringify({
                logIds: walk.logs.map(log => log.id),
            } satisfies WalkDeleteRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }, [])

    const logActivity = useCallback(async (
        type: RoutineStatus['type'],
        loggedBy: UserName,
        assignedTo: UserName,
        createdAt: Date
    ) => {
        await apiFetch<ApiSuccessResponse>('/api/activities', {
            method: 'POST',
            body: JSON.stringify({
                type,
                loggedBy,
                assignedTo,
                createdAt: createdAt.toISOString(),
            } satisfies ActivityCreateRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }, [])

    const updateActivity = useCallback(async (
        id: string,
        loggedBy: UserName,
        assignedTo: UserName,
        createdAt: Date
    ) => {
        await apiFetch<ApiSuccessResponse>('/api/activities', {
            method: 'PATCH',
            body: JSON.stringify({
                id,
                loggedBy,
                assignedTo,
                createdAt: createdAt.toISOString(),
            } satisfies ActivityUpdateRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }, [])

    const deleteActivity = useCallback(async (id: string) => {
        await apiFetch<ApiSuccessResponse>('/api/activities', {
            method: 'DELETE',
            body: JSON.stringify({
                id,
            } satisfies ActivityDeleteRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }, [])

    const toysStatus = useMemo(() => getRoutineStatus(dataDate === dateKey ? activities : [], 'toys', selectedDate), [activities, selectedDate, dataDate, dateKey])
    const dinnerStatus = useMemo(() => getRoutineStatus(dataDate === dateKey ? activities : [], 'dinner', selectedDate), [activities, selectedDate, dataDate, dateKey])

    return {
        selectedDate,
        setSelectedDate,
        dayStats,
        dayActivities: dataDate === dateKey ? activities : [],
        toysStatus,
        dinnerStatus,
        isLoading: isLoading && dataDate !== dateKey,
        isRefreshing: isLoading && dataDate === dateKey,
        error,
        goToPreviousDay,
        goToNextDay,
        isToday,
        addWalk,
        updateWalk,
        deleteWalk,
        logActivity,
        updateActivity,
        deleteActivity,
        refetch,
    }
}

export function useAnalytics(): UseAnalyticsReturn {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const requestId = useRef(0)
    const fetchAnalytics = useCallback(async (afterSave = false) => {
        const id = ++requestId.current
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

            if (id !== requestId.current) return
            setAnalytics({
                last7Days: dailyStats.slice(-7),
                last30Days: dailyStats,
                walkerStats,
                bestStreak: calculateBestStreak(dailyStats),
                averageWalksPerDay,
                averagePoopsPerDay,
                timeOfDayDistribution: calculateTimeOfDayDistribution(logs),
            })
        } catch {
            if (id === requestId.current) setError(afterSave ? 'Change saved, but analytics could not refresh. Please refresh analytics.' : 'Analytics could not be checked. Please refresh analytics.')
        } finally {
            if (id === requestId.current) setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchAnalytics()
    }, [fetchAnalytics])

    useEffect(() => {
        const handler = () => {
            void fetchAnalytics(true)
        }

        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
            requestId.current += 1
        }
    }, [fetchAnalytics])

    return {
        analytics,
        isLoading,
        error,
        refetch: fetchAnalytics,
    }
}

'use client'

import { useState, useCallback, useMemo } from 'react'
import { dateRange, useCareCalendar, useCareResource } from '@/lib/care-data-context'
import { careReadError } from '@/lib/care-data-store'
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
import type { Activity, UserName } from '@/lib/database.types'
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
    const { now } = useCareCalendar()
    const dayLogs = useCareResource('logs', dateRange(selectedDate))
    const dayRoutines = useCareResource('activities', dateRange(selectedDate))
    const logs = useMemo(() => dayLogs.data ?? [], [dayLogs.data])
    const activities = useMemo(() => dayRoutines.data ?? [], [dayRoutines.data])
    const ready = dayLogs.data !== null && dayRoutines.data !== null
    const isLoading = dayLogs.isLoading || dayRoutines.isLoading
    const error = careReadError(dayLogs, 'history') ?? careReadError(dayRoutines, 'history')

    const dayStats = useMemo((): DayStats | null => {
        if (!ready) return null
        const walks = groupLogsIntoWalks(logs)
        return {
            date: selectedDate,
            dateFormatted: format(selectedDate, 'EEEE, MMMM d'),
            poopCount: logs.filter(log => log.type === 'poop').length,
            peeCount: logs.filter(log => log.type === 'pee').length,
            walksCount: walks.length,
            walks,
        }
    }, [logs, selectedDate, ready])

    const isToday = useMemo(() => {
        const today = now
        return (
            selectedDate.getDate() === today.getDate() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getFullYear() === today.getFullYear()
        )
    }, [selectedDate, now])

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

    const refetch = async () => { await Promise.all([dayLogs.refetch(), dayRoutines.refetch()]) }

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

    const toysStatus = useMemo(() => getRoutineStatus(activities, 'toys', selectedDate), [activities, selectedDate])
    const dinnerStatus = useMemo(() => getRoutineStatus(activities, 'dinner', selectedDate), [activities, selectedDate])

    return {
        selectedDate,
        setSelectedDate,
        dayStats,
        dayActivities: activities,
        toysStatus,
        dinnerStatus,
        isLoading,
        isRefreshing: ready && (dayLogs.pending || dayRoutines.pending),
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
    const { now } = useCareCalendar()
    const thirtyDaysAgo = subDays(now, 30)
    const resource = useCareResource('logs', { start: startOfDay(thirtyDaysAgo).toISOString(), end: endOfDay(now).toISOString() })
    const analytics = useMemo((): AnalyticsData | null => {
        if (resource.data === null) return null
        const logs = resource.data
        const intervalDays = eachDayOfInterval({ start: startOfDay(subDays(now, 30)), end: startOfDay(now) })
        const dailyStats: DayStats[] = intervalDays.map(date => {
            const dayLogs = logs.filter(log => new Date(log.created_at) >= startOfDay(date) && new Date(log.created_at) <= endOfDay(date))
            const walks = groupLogsIntoWalks(dayLogs)
            return { date, dateFormatted: format(date, 'EEE'), poopCount: dayLogs.filter(log => log.type === 'poop').length, peeCount: dayLogs.filter(log => log.type === 'pee').length, walksCount: walks.length, walks }
        })
        const allWalks = dailyStats.flatMap(day => day.walks)
        return {
            last7Days: dailyStats.slice(-7), last30Days: dailyStats,
            walkerStats: calculateWalkerStats(logs, allWalks), bestStreak: calculateBestStreak(dailyStats),
            averageWalksPerDay: dailyStats.reduce((sum, day) => sum + day.walksCount, 0) / dailyStats.length,
            averagePoopsPerDay: dailyStats.reduce((sum, day) => sum + day.poopCount, 0) / dailyStats.length,
            timeOfDayDistribution: calculateTimeOfDayDistribution(logs),
        }
    }, [resource.data, now])
    return { analytics, isLoading: resource.pending || resource.isLoading, error: careReadError(resource, 'analytics'), refetch: resource.refetch }
}

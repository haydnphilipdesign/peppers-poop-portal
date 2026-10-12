'use client'

import { useMemo } from 'react'
import { dateRange, useCareCalendar, useCareResource } from '@/lib/care-data-context'
import { careReadError } from '@/lib/care-data-store'
import { apiFetch } from '@/lib/api-client'
import type { ApiSuccessResponse, WalkCreateRequest, WalkDeleteRequest, WalkUpdateRequest } from '@/lib/api-types'
import type { Log, LogType, UserName } from '@/lib/database.types'
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
    latestIsLoading: boolean
    latestIsRefreshing: boolean
    latestError: string | null
    scoringError: string | null
    scoringHasLoaded: boolean
    refetchScoring: () => Promise<void>
    monthlyPoints: Record<UserName, number>
}

export function useLogs(): UseLogsReturn {
    const { now } = useCareCalendar()
    const today = useCareResource('logs', dateRange(now))
    const month = useCareResource('logs', dateRange(now, true))
    const recent = useCareResource('logs', { start: startOfDay(subDays(now, 30)).toISOString(), end: endOfDay(now).toISOString() })
    const activities = useCareResource('activities', dateRange(now, true))
    const reminders = useCareResource('reminders')
    const todayLogs = useMemo(() => today.data ?? [], [today.data])
    const monthlyLogs = useMemo(() => month.data ?? [], [month.data])
    const allLogs = useMemo(() => recent.data ?? [], [recent.data])
    const monthlyActivities = useMemo(() => activities.data ?? [], [activities.data])
    const monthlyReminders = useMemo(() => filterRemindersForMonth(reminders.data ?? [], startOfMonth(now), endOfMonth(now)), [reminders.data, now])
    const hasLoaded = today.data !== null
    const isLoading = today.isLoading
    const isRefreshing = today.pending && hasLoaded
    const error = careReadError(today, 'care data')
    const latestError = careReadError(recent, 'latest walk')
    const scoringError = careReadError(month, 'leaderboard') ?? careReadError(activities, 'leaderboard') ?? careReadError(reminders, 'leaderboard')
    const scoringHasLoaded = month.data !== null && activities.data !== null && reminders.data !== null
    const refetch = async () => { await Promise.all([today.refetch(), recent.refetch()]) }
    const refetchScoring = async () => { await Promise.all([month.refetch(), activities.refetch(), reminders.refetch()]) }

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

    const streak = calculatePoopStreak(allLogs)

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
        refetch,
        latestIsLoading: recent.isLoading,
        latestIsRefreshing: recent.pending && recent.data !== null,
        latestError,
        scoringError,
        scoringHasLoaded,
        refetchScoring,
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        streak,
        monthlyPoints,
    }
}

export type { Walk }

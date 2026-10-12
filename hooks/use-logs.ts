'use client'

import { useMemo } from 'react'
import { dateRange, useCareCalendar, useCareResource } from '@/lib/care-data-context'
import { careReadError } from '@/lib/care-data-store'
import { useWalkMutation } from '@/hooks/use-walk-mutation'
import type { WalkCreateDraft, WalkDeleteRequest, WalkUpdateRequest } from '@/lib/api-types'
import type { Log, LogType, UserName } from '@/lib/database.types'
import {
    calculatePoopStreak,
    calculateMonthlyPoints,
    filterRemindersForMonth,
    recordsToWalks,
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
    addWalk: (options: { draftId?: string; poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => Promise<void>
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
    const mutateWalk = useWalkMutation()
    const { now } = useCareCalendar()
    const today = useCareResource('walks', dateRange(now))
    const todayOutcomes = useCareResource('logs', dateRange(now))
    const recentOutcomes = useCareResource('logs', { start: startOfDay(subDays(now, 30)).toISOString(), end: endOfDay(now).toISOString() })
    const month = useCareResource('walks', dateRange(now, true))
    const recent = useCareResource('walks', { start: startOfDay(subDays(now, 30)).toISOString(), end: endOfDay(now).toISOString() })
    const activities = useCareResource('activities', dateRange(now, true))
    const reminders = useCareResource('reminders')
    const todayLogs = useMemo(() => todayOutcomes.data ?? [], [todayOutcomes.data])
    const monthlyLogs = useMemo(() => month.data?.flatMap(walk => walk.logs) ?? [], [month.data])
    const allLogs = useMemo(() => recentOutcomes.data ?? [], [recentOutcomes.data])
    const monthlyActivities = useMemo(() => activities.data ?? [], [activities.data])
    const monthlyReminders = useMemo(() => filterRemindersForMonth(reminders.data ?? [], startOfMonth(now), endOfMonth(now)), [reminders.data, now])
    const hasLoaded = today.data !== null && todayOutcomes.data !== null
    const isLoading = today.isLoading || todayOutcomes.isLoading
    const isRefreshing = (today.pending || todayOutcomes.pending) && hasLoaded
    const error = careReadError(today, 'care data') ?? careReadError(todayOutcomes, 'care data')
    const latestError = careReadError(recent, 'latest walk')
    const scoringError = careReadError(month, 'leaderboard') ?? careReadError(activities, 'leaderboard') ?? careReadError(reminders, 'leaderboard')
    const scoringHasLoaded = month.data !== null && activities.data !== null && reminders.data !== null
    const refetch = async () => { await Promise.all([today.refetch(), todayOutcomes.refetch(), recent.refetch(), recentOutcomes.refetch()]) }
    const refetchScoring = async () => { await Promise.all([month.refetch(), activities.refetch(), reminders.refetch()]) }

    const addWalk = async (options: { draftId?: string; poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => {
        await mutateWalk({
            method: 'POST',
            body: JSON.stringify({
                draftId: options.draftId,
                poop: options.poop,
                pee: options.pee,
                userName: options.userName,
                createdAt: options.createdAt?.toISOString(),
            } satisfies WalkCreateDraft),
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
        await mutateWalk({
            method: 'DELETE',
            body: JSON.stringify({
                walkId: walk.id, expectedRevision: walk.revision,
            } satisfies Omit<WalkDeleteRequest, 'requestId'>),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }

    const updateWalk = async (
        walk: Walk,
        updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }
    ) => {
        await mutateWalk({
            method: 'PATCH',
            body: JSON.stringify({
                walkId: walk.id, expectedRevision: walk.revision,
                poop: updates.poop,
                pee: updates.pee,
                userName: updates.userName,
                createdAt: updates.time.toISOString(),
            } satisfies Omit<WalkUpdateRequest, 'requestId'>),
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

    const todayWalks = useMemo(() => recordsToWalks(today.data ?? []), [today.data])
    const latestWalk = useMemo(() => recordsToWalks(recent.data ?? []).at(-1) ?? null, [recent.data])

    const todayWalksCount = todayWalks.length
    const monthlyPoints = useMemo(
        () => calculateMonthlyPoints(monthlyLogs, monthlyActivities, monthlyReminders, recordsToWalks(month.data ?? [])),
        [monthlyActivities, monthlyLogs, monthlyReminders, month.data]
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

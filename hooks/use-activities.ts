'use client'

import { dateRange, useCareCalendar, useCareResource } from '@/lib/care-data-context'
import { careReadError } from '@/lib/care-data-store'
import { apiFetch } from '@/lib/api-client'
import type { ActivityCreateRequest, ApiSuccessResponse } from '@/lib/api-types'
import type { Activity, ActivityType, UserName } from '@/lib/database.types'

interface UseActivitiesReturn {
    todayActivities: Activity[]
    isLoading: boolean
    hasLoaded: boolean
    error: string | null
    isToysFilled: boolean
    isDinnerDone: boolean
    toysFilledBy: UserName | null
    dinnerDoneBy: UserName | null
    logActivity: (type: ActivityType, loggedBy: UserName, assignedTo: UserName, createdAt?: Date) => Promise<void>
    refetch: () => Promise<void>
}

export function useActivities(): UseActivitiesReturn {
    const { now } = useCareCalendar()
    const resource = useCareResource('activities', dateRange(now))
    const todayActivities = resource.data ?? []
    const isLoading = resource.pending || resource.isLoading
    const hasLoaded = resource.data !== null
    const error = careReadError(resource, 'routines')

    const logActivity = async (type: ActivityType, loggedBy: UserName, assignedTo: UserName, createdAt?: Date) => {
        const timestamp = createdAt ?? new Date()
        await apiFetch<ApiSuccessResponse>('/api/activities', {
            method: 'POST',
            body: JSON.stringify({
                createdAt: timestamp.toISOString(),
                type,
                loggedBy,
                assignedTo,
            } satisfies ActivityCreateRequest),
        })

        window.dispatchEvent(new Event('ppp:data-changed'))
    }

    // Computed values
    const isToysFilled = todayActivities.some(a => a.type === 'toys')
    const isDinnerDone = todayActivities.some(a => a.type === 'dinner')

    const toysActivity = todayActivities.find(a => a.type === 'toys')
    const dinnerActivity = todayActivities.find(a => a.type === 'dinner')

    const toysFilledBy = toysActivity?.assigned_to || null
    const dinnerDoneBy = dinnerActivity?.assigned_to || null

    return {
        todayActivities,
        isLoading,
        hasLoaded,
        error,
        isToysFilled,
        isDinnerDone,
        toysFilledBy,
        dinnerDoneBy,
        logActivity,
        refetch: resource.refetch,
    }
}

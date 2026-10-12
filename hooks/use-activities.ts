'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type { ActivityCreateRequest, ApiSuccessResponse } from '@/lib/api-types'
import type { Activity, ActivityType, UserName } from '@/lib/database.types'
import { startOfDay, endOfDay } from 'date-fns'

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
    const [todayActivities, setTodayActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const requestId = useRef(0)
    const [hasLoaded, setHasLoaded] = useState(false)
    const fetchActivities = useCallback(async (afterSave = false) => {
        const id = ++requestId.current
        try {
            setIsLoading(true)
            const now = new Date()
            const todayStart = startOfDay(now)
            const todayEnd = endOfDay(now)

            const { data, error: fetchError } = await supabase
                .from('activities')
                .select('*')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString())
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError

            if (id !== requestId.current) return
            setHasLoaded(true)
            setTodayActivities(data || [])
            setError(null)
        } catch {
            if (id === requestId.current) setError(afterSave
                ? 'Change saved, but routines could not refresh. Refresh routines; do not save again.'
                : 'Routines could not be checked. Displayed routines may be out of date. Please refresh.')
        } finally {
            if (id === requestId.current) setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchActivities()
        const handler = () => { void fetchActivities(true) }
        window.addEventListener('ppp:data-changed', handler)
        return () => {
            window.removeEventListener('ppp:data-changed', handler)
            requestId.current += 1
        }
    }, [fetchActivities])

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
        refetch: fetchActivities,
    }
}

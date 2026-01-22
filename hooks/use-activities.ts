'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Activity, ActivityType, UserName } from '@/lib/database.types'
import { startOfDay, endOfDay } from 'date-fns'

interface UseActivitiesReturn {
    todayActivities: Activity[]
    isLoading: boolean
    error: string | null
    isToysFilled: boolean
    isDinnerDone: boolean
    toysFilledBy: UserName | null
    dinnerDoneBy: UserName | null
    logActivity: (type: ActivityType, loggedBy: UserName, assignedTo: UserName) => Promise<void>
    refetch: () => Promise<void>
}

export function useActivities(): UseActivitiesReturn {
    const [todayActivities, setTodayActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchActivities = useCallback(async () => {
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

            setTodayActivities(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch activities')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchActivities()
    }, [fetchActivities])

    const logActivity = async (type: ActivityType, loggedBy: UserName, assignedTo: UserName) => {
        const timestamp = new Date()

        // Optimistic update
        const optimisticActivity: Activity = {
            id: `temp-${Date.now()}`,
            created_at: timestamp.toISOString(),
            type,
            logged_by: loggedBy,
            assigned_to: assignedTo,
        }

        setTodayActivities(prev => [optimisticActivity, ...prev])

        try {
            const { error: insertError } = await supabase
                .from('activities')
                .insert({
                    created_at: timestamp.toISOString(),
                    type,
                    logged_by: loggedBy,
                    assigned_to: assignedTo,
                } as never)

            if (insertError) throw insertError

            // Refetch to get real data
            await fetchActivities()
            window.dispatchEvent(new Event('ppp:data-changed'))
        } catch (err) {
            // Rollback
            setTodayActivities(prev => prev.filter(a => a.id !== optimisticActivity.id))
            const errorMessage = err instanceof Error ? err.message : 'Failed to log activity'
            setError(errorMessage)
        }
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
        error,
        isToysFilled,
        isDinnerDone,
        toysFilledBy,
        dinnerDoneBy,
        logActivity,
        refetch: fetchActivities,
    }
}

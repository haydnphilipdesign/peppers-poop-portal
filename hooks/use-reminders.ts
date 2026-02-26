'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type {
    ApiSuccessResponse,
    ReminderCompleteRequest,
    ReminderLogRequest,
} from '@/lib/api-types'
import type { Reminder, ReminderType, UserName } from '@/lib/database.types'
import { startOfDay, addWeeks, isBefore, parseISO, format } from 'date-fns'

const REMINDERS_CHANGED_EVENT = 'ppp:reminders-changed'

interface UseRemindersReturn {
    reminders: Reminder[]
    overdueReminders: Reminder[]
    upcomingReminders: Reminder[]
    isLoading: boolean
    error: string | null
    isSimparicaDue: boolean
    isGroomingDue: boolean
    addReminder: (type: ReminderType, dueDate: Date, notes?: string, completedBy?: UserName, completedAt?: Date) => Promise<void>
    completeReminder: (id: string, completedBy: UserName, completedAt?: Date) => Promise<void>
    getLastCompletedDate: (type: ReminderType) => Date | null
    refetch: () => Promise<void>
}

export function useReminders(): UseRemindersReturn {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasFetchedOnce, setHasFetchedOnce] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const instanceIdRef = useRef(`use-reminders-${Date.now()}-${Math.random()}`)

    const fetchReminders = useCallback(async () => {
        try {
            setIsLoading(true)

            const { data, error: fetchError } = await supabase
                .from('reminders')
                .select('*')
                .order('due_date', { ascending: false })

            if (fetchError) throw fetchError

            setReminders(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch reminders')
        } finally {
            setHasFetchedOnce(true)
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchReminders()
    }, [fetchReminders])

    useEffect(() => {
        const handler = (event: Event) => {
            const customEvent = event as CustomEvent<{
                instanceId?: string
            }>

            if (customEvent.detail?.instanceId === instanceIdRef.current) {
                return
            }

            void fetchReminders()
        }

        window.addEventListener(REMINDERS_CHANGED_EVENT, handler)
        return () => {
            window.removeEventListener(REMINDERS_CHANGED_EVENT, handler)
        }
    }, [fetchReminders])

    const dispatchReminderChanged = useCallback(() => {
        window.dispatchEvent(new Event('ppp:data-changed'))
        window.dispatchEvent(
            new CustomEvent(REMINDERS_CHANGED_EVENT, {
                detail: {
                    instanceId: instanceIdRef.current,
                },
            })
        )
    }, [])

    const addReminder = async (type: ReminderType, dueDate: Date, notes?: string, completedBy?: UserName, completedAt?: Date) => {
        const formattedDueDate = format(dueDate, 'yyyy-MM-dd')

        // Check if a reminder of this type already exists for this date
        const existing = reminders.find(r =>
            r.type === type &&
            r.due_date === formattedDueDate &&
            !r.completed_at
        )

        if (existing) {
            if (completedBy) {
                await completeReminder(existing.id, completedBy, completedAt)
                return
            }
            return
        }

        const timestamp = new Date()
        const completedTimestamp = completedBy ? (completedAt || new Date()) : null

        // Optimistic update
        const optimisticReminder: Reminder = {
            id: `temp-${Date.now()}`,
            created_at: timestamp.toISOString(),
            type,
            due_date: formattedDueDate,
            completed_at: completedTimestamp ? completedTimestamp.toISOString() : null,
            completed_by: completedBy || null,
            notes: notes || null,
        }

        setReminders(prev => [optimisticReminder, ...prev])

        try {
            await apiFetch<ApiSuccessResponse>('/api/reminders/log', {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    dueDate: formattedDueDate,
                    completedBy,
                    completedAt: completedTimestamp ? completedTimestamp.toISOString() : undefined,
                    notes: notes || undefined,
                } satisfies ReminderLogRequest),
            })

            await fetchReminders()
            dispatchReminderChanged()
        } catch (err) {
            setReminders(prev => prev.filter(r => r.id !== optimisticReminder.id))
            const errorMessage = err instanceof Error ? err.message : 'Failed to add reminder'
            setError(errorMessage)
        }
    }

    const completeReminder = async (id: string, completedBy: UserName, completedAt?: Date) => {
        const timestamp = completedAt || new Date()

        // Optimistic update
        setReminders(prev => prev.map(r =>
            r.id === id
                ? { ...r, completed_at: timestamp.toISOString(), completed_by: completedBy }
                : r
        ))

        try {
            await apiFetch<ApiSuccessResponse>('/api/reminders/complete', {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    completedBy,
                    completedAt: timestamp.toISOString(),
                } satisfies ReminderCompleteRequest),
            })

            await fetchReminders()
            dispatchReminderChanged()
        } catch (err) {
            await fetchReminders() // Rollback by refetching
            const errorMessage = err instanceof Error ? err.message : 'Failed to complete reminder'
            setError(errorMessage)
        }
    }

    const getLastCompletedDate = useCallback((type: ReminderType): Date | null => {
        const completed = reminders
            .filter(r => r.type === type && r.completed_at)
            .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

        return completed.length > 0 ? new Date(completed[0].completed_at!) : null
    }, [reminders])

    // Computed values
    const now = new Date()
    const today = startOfDay(now)

    // Get overdue (past due_date, not completed) and upcoming (within next 7 days) reminders
    const overdueReminders = reminders.filter(r => {
        if (r.completed_at) return false
        const dueDate = parseISO(r.due_date)
        return isBefore(dueDate, today)
    })

    const upcomingReminders = (() => {
        const nextWeek = addWeeks(today, 1)
        return reminders.filter(r => {
            if (r.completed_at) return false
            const dueDate = parseISO(r.due_date)
            return !isBefore(dueDate, today) && isBefore(dueDate, nextWeek)
        })
    })()

    // Simparica is due on the 20th of each month
    const isSimparicaDue = (() => {
        // Avoid flash on first render before reminders are loaded.
        if (!hasFetchedOnce) return false

        const currentDay = now.getDate()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        // Check if we've completed Simparica this month
        const thisMonthSimparica = reminders.find(r => {
            if (r.type !== 'simparica' || !r.completed_at) return false
            const completedDate = new Date(r.completed_at)
            return completedDate.getMonth() === currentMonth &&
                completedDate.getFullYear() === currentYear
        })

        if (thisMonthSimparica) return false

        // It's due if it's the 20th or later
        return currentDay >= 20
    })()

    // Grooming is due if last grooming was 6+ weeks ago
    const isGroomingDue = (() => {
        const lastGrooming = getLastCompletedDate('grooming')
        if (!lastGrooming) return false // Don't show if never logged

        const sixWeeksAgo = addWeeks(today, -6)
        return isBefore(lastGrooming, sixWeeksAgo)
    })()

    return {
        reminders,
        overdueReminders,
        upcomingReminders,
        isLoading,
        error,
        isSimparicaDue,
        isGroomingDue,
        addReminder,
        completeReminder,
        getLastCompletedDate,
        refetch: fetchReminders,
    }
}

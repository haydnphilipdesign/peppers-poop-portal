'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Reminder, ReminderType, UserName } from '@/lib/database.types'
import { startOfDay, endOfDay, addWeeks, isBefore, isAfter, parseISO, format } from 'date-fns'

interface UseRemindersReturn {
    reminders: Reminder[]
    overdueReminders: Reminder[]
    upcomingReminders: Reminder[]
    isLoading: boolean
    error: string | null
    isSimparicaDue: boolean
    isGroomingDue: boolean
    addReminder: (type: ReminderType, dueDate: Date, notes?: string) => Promise<void>
    completeReminder: (id: string, completedBy: UserName) => Promise<void>
    getLastCompletedDate: (type: ReminderType) => Date | null
    refetch: () => Promise<void>
}

export function useReminders(): UseRemindersReturn {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchReminders = useCallback(async () => {
        try {
            setIsLoading(true)

            // Fetch all reminders from the last 6 months
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

            const { data, error: fetchError } = await supabase
                .from('reminders')
                .select('*')
                .gte('created_at', sixMonthsAgo.toISOString())
                .order('due_date', { ascending: false })

            if (fetchError) throw fetchError

            setReminders(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch reminders')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchReminders()
    }, [fetchReminders])

    const addReminder = async (type: ReminderType, dueDate: Date, notes?: string) => {
        const timestamp = new Date()

        // Optimistic update
        const optimisticReminder: Reminder = {
            id: `temp-${Date.now()}`,
            created_at: timestamp.toISOString(),
            type,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            completed_at: null,
            completed_by: null,
            notes: notes || null,
        }

        setReminders(prev => [optimisticReminder, ...prev])

        try {
            const { error: insertError } = await supabase
                .from('reminders')
                .insert({
                    created_at: timestamp.toISOString(),
                    type,
                    due_date: format(dueDate, 'yyyy-MM-dd'),
                    notes: notes || null,
                } as never)

            if (insertError) throw insertError

            await fetchReminders()
        } catch (err) {
            setReminders(prev => prev.filter(r => r.id !== optimisticReminder.id))
            const errorMessage = err instanceof Error ? err.message : 'Failed to add reminder'
            setError(errorMessage)
        }
    }

    const completeReminder = async (id: string, completedBy: UserName) => {
        const timestamp = new Date()

        // Optimistic update
        setReminders(prev => prev.map(r =>
            r.id === id
                ? { ...r, completed_at: timestamp.toISOString(), completed_by: completedBy }
                : r
        ))

        try {
            const { error: updateError } = await supabase
                .from('reminders')
                .update({
                    completed_at: timestamp.toISOString(),
                    completed_by: completedBy,
                })
                .eq('id', id)

            if (updateError) throw updateError

            await fetchReminders()
        } catch (err) {
            await fetchReminders() // Rollback by refetching
            const errorMessage = err instanceof Error ? err.message : 'Failed to complete reminder'
            setError(errorMessage)
        }
    }

    const getLastCompletedDate = (type: ReminderType): Date | null => {
        const completed = reminders
            .filter(r => r.type === type && r.completed_at)
            .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

        return completed.length > 0 ? new Date(completed[0].completed_at!) : null
    }

    // Computed values
    const now = new Date()
    const today = startOfDay(now)

    // Get overdue (past due_date, not completed) and upcoming (within next 7 days) reminders
    const overdueReminders = useMemo(() => {
        return reminders.filter(r => {
            if (r.completed_at) return false
            const dueDate = parseISO(r.due_date)
            return isBefore(dueDate, today)
        })
    }, [reminders, today])

    const upcomingReminders = useMemo(() => {
        const nextWeek = addWeeks(today, 1)
        return reminders.filter(r => {
            if (r.completed_at) return false
            const dueDate = parseISO(r.due_date)
            return !isBefore(dueDate, today) && isBefore(dueDate, nextWeek)
        })
    }, [reminders, today])

    // Simparica is due on the 21st of each month
    const isSimparicaDue = useMemo(() => {
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

        // It's due if it's the 21st or later
        return currentDay >= 21
    }, [reminders, now])

    // Grooming is due if last grooming was 6+ weeks ago
    const isGroomingDue = useMemo(() => {
        const lastGrooming = getLastCompletedDate('grooming')
        if (!lastGrooming) return false // Don't show if never logged

        const sixWeeksAgo = addWeeks(today, -6)
        return isBefore(lastGrooming, sixWeeksAgo)
    }, [reminders, today])

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

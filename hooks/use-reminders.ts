'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-client'
import type {
    ApiSuccessResponse,
    ReminderCompleteRequest,
    ReminderLogRequest,
    ReminderScheduleRequest,
} from '@/lib/api-types'
import type { Reminder, ReminderType, UserName } from '@/lib/database.types'
import { startOfDay, addDays, addWeeks, isBefore, parseISO, format } from 'date-fns'

const REMINDERS_CHANGED_EVENT = 'ppp:reminders-changed'

interface UseRemindersReturn {
    reminders: Reminder[]
    overdueReminders: Reminder[]
    upcomingReminders: Reminder[]
    isLoading: boolean
    hasLoaded: boolean
    error: string | null
    isSimparicaDue: boolean
    isGroomingDue: boolean
    activeGroomingReminder: Reminder | null
    activeVetReminder: Reminder | null
    groomingAppointmentReminder: Reminder | null
    addReminder: (type: ReminderType, dueDate: Date, notes?: string, completedBy?: UserName, completedAt?: Date) => Promise<void>
    scheduleReminder: (type: ReminderType, appointmentAt: Date, scheduledBy: UserName, notes?: string) => Promise<void>
    completeReminder: (id: string, completedBy: UserName, completedAt?: Date) => Promise<void>
    getLastCompletedDate: (type: ReminderType) => Date | null
    refetch: () => Promise<void>
}

export function useReminders(): UseRemindersReturn {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const requestId = useRef(0)

    const fetchReminders = useCallback(async (afterSave = false) => {
        const id = ++requestId.current
        try {
            setIsLoading(true)

            const { data, error: fetchError } = await supabase
                .from('reminders')
                .select('*')
                .order('due_date', { ascending: false })

            if (fetchError) throw fetchError

            if (id !== requestId.current) return
            setHasLoaded(true)
            setReminders(data || [])
            setError(null)
        } catch {
            if (id === requestId.current) setError(afterSave
                ? 'Change saved, but reminders could not refresh. Refresh reminders; do not save again.'
                : 'Care reminders could not be checked. Displayed reminders may be out of date. Please refresh.')
        } finally {
            if (id === requestId.current) {
                setIsLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        void fetchReminders()
        const handler = () => { void fetchReminders(true) }
        window.addEventListener(REMINDERS_CHANGED_EVENT, handler)
        return () => {
            window.removeEventListener(REMINDERS_CHANGED_EVENT, handler)
            requestId.current += 1
        }
    }, [fetchReminders])

    const dispatchReminderChanged = () => {
        window.dispatchEvent(new Event('ppp:data-changed'))
        window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT))
    }

    const getActiveScheduledReminder = useCallback((type: ReminderType) => {
        const scheduled = reminders
            .filter(reminder =>
                reminder.type === type &&
                !reminder.completed_at &&
                reminder.appointment_at
            )
            .sort((a, b) => {
                const aTimestamp = new Date(a.scheduled_at ?? a.created_at).getTime()
                const bTimestamp = new Date(b.scheduled_at ?? b.created_at).getTime()
                return bTimestamp - aTimestamp
            })

        return scheduled[0] ?? null
    }, [reminders])

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

        const completedTimestamp = completedBy ? (completedAt || new Date()) : null
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

        dispatchReminderChanged()
    }

    const scheduleReminder = async (type: ReminderType, appointmentAt: Date, scheduledBy: UserName, notes?: string) => {
        const existingReminder = getActiveScheduledReminder(type)
        const formattedDueDate = format(appointmentAt, 'yyyy-MM-dd')
        const scheduledAt = new Date()

        await apiFetch<ApiSuccessResponse>('/api/reminders/schedule', {
            method: 'POST',
            body: JSON.stringify({
                id: existingReminder?.id,
                type,
                dueDate: formattedDueDate,
                appointmentAt: appointmentAt.toISOString(),
                scheduledBy,
                scheduledAt: scheduledAt.toISOString(),
                notes: notes ?? undefined,
            } satisfies ReminderScheduleRequest),
        })

        dispatchReminderChanged()
    }

    const completeReminder = async (id: string, completedBy: UserName, completedAt?: Date) => {
        const timestamp = completedAt || new Date()

        await apiFetch<ApiSuccessResponse>('/api/reminders/complete', {
            method: 'POST',
            body: JSON.stringify({
                id,
                completedBy,
                completedAt: timestamp.toISOString(),
            } satisfies ReminderCompleteRequest),
        })

        dispatchReminderChanged()
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
    const dayAfterTomorrow = addDays(today, 2)

    const activeGroomingReminder = useMemo(
        () => getActiveScheduledReminder('grooming'),
        [getActiveScheduledReminder]
    )

    const activeVetReminder = useMemo(
        () => getActiveScheduledReminder('vet'),
        [getActiveScheduledReminder]
    )

    const groomingAppointmentReminder = useMemo(() => {
        if (!activeGroomingReminder?.appointment_at) {
            return null
        }

        const appointmentAt = parseISO(activeGroomingReminder.appointment_at)
        return isBefore(appointmentAt, dayAfterTomorrow) ? activeGroomingReminder : null
    }, [activeGroomingReminder, dayAfterTomorrow])

    // Get overdue (past due_date, not completed) and upcoming (within next 7 days) reminders
    const overdueReminders = reminders.filter(r => {
        if (r.completed_at) return false
        if (r.type === 'grooming' && r.appointment_at && r.id === activeGroomingReminder?.id) return false
        const dueDate = parseISO(r.due_date)
        return isBefore(dueDate, today)
    })

    const upcomingReminders = (() => {
        const nextWeek = addWeeks(today, 1)
        return reminders.filter(r => {
            if (r.completed_at) return false
            if (r.type === 'grooming' && r.appointment_at && r.id === activeGroomingReminder?.id) return false
            const dueDate = parseISO(r.due_date)
            return !isBefore(dueDate, today) && isBefore(dueDate, nextWeek)
        })
    })()

    // Simparica is due on the 20th of each month
    const isSimparicaDue = (() => {
        // Avoid flash on first render before reminders are loaded.
        if (!hasLoaded) return false

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
        if (activeGroomingReminder) return false

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
        hasLoaded,
        error,
        isSimparicaDue,
        isGroomingDue,
        activeGroomingReminder,
        activeVetReminder,
        groomingAppointmentReminder,
        addReminder,
        scheduleReminder,
        completeReminder,
        getLastCompletedDate,
        refetch: fetchReminders,
    }
}

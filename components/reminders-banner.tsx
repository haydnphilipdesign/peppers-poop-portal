'use client'

import { useState, type ReactNode } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { FAMILY_ORDER } from '@/lib/family'
import { FamilyAvatar } from '@/components/family-avatar'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, Check, Loader2, Pill, Scissors, Stethoscope, X } from 'lucide-react'
import { addDays, format, isToday, isTomorrow, parse, parseISO } from 'date-fns'

const DEFAULT_APPOINTMENT_HOUR = 10

function createDefaultAppointmentInput() {
    const defaultAppointment = addDays(new Date(), 1)
    defaultAppointment.setHours(DEFAULT_APPOINTMENT_HOUR, 0, 0, 0)
    return format(defaultAppointment, "yyyy-MM-dd'T'HH:mm")
}

const REMINDER_CONFIG: Record<ReminderType, { icon: ReactNode; label: string; color: string }> = {
    simparica: {
        icon: <Pill className="h-5 w-5" />,
        label: 'Simparica Trio',
        color: 'border-rose-200 bg-rose-50/85 text-rose-900',
    },
    grooming: {
        icon: <Scissors className="h-5 w-5" />,
        label: 'Grooming',
        color: 'border-sky-200 bg-sky-50/85 text-sky-900',
    },
    vet: {
        icon: <Stethoscope className="h-5 w-5" />,
        label: 'Vet appointment',
        color: 'border-violet-200 bg-violet-50/85 text-violet-900',
    },
}

type BannerAlert =
    | {
          id: string
          type: ReminderType
          kind: 'complete'
          message: string
          actionLabel?: string
          onComplete: (user: UserName) => Promise<void>
      }
    | {
          id: string
          type: 'grooming'
          kind: 'schedule'
          message: string
          onSchedule: (user: UserName, appointmentAt: Date) => Promise<void>
      }

export function RemindersBanner() {
    const { user } = useUser()
    const isReadOnly = useReadOnly()
    const {
        isSimparicaDue,
        isGroomingDue,
        groomingAppointmentReminder,
        overdueReminders,
        addReminder,
        scheduleReminder,
        completeReminder,
        getLastCompletedDate,
        isLoading,
    } = useReminders()

    const [activeAction, setActiveAction] = useState<string | null>(null)
    const [completing, setCompleting] = useState<string | null>(null)
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())
    const [appointmentInput, setAppointmentInput] = useState<string>(createDefaultAppointmentInput)

    const handleCompleteSimparica = async (completedBy: UserName) => {
        if (!user) return

        setCompleting('simparica')
        try {
            const today = new Date()
            await addReminder('simparica', today, undefined, completedBy)
        } finally {
            setCompleting(null)
            setActiveAction(null)
        }
    }

    const handleScheduleGrooming = async (scheduledBy: UserName, appointmentAt: Date) => {
        if (!user) return

        setCompleting('grooming')
        try {
            await scheduleReminder('grooming', appointmentAt, scheduledBy)
        } finally {
            setCompleting(null)
            setActiveAction(null)
            setAppointmentInput(createDefaultAppointmentInput())
        }
    }

    const handleDismiss = (type: string) => {
        setDismissed((prev) => new Set([...prev, type]))
    }

    const alerts: BannerAlert[] = []

    if (isSimparicaDue && !dismissed.has('simparica')) {
        alerts.push({
            id: 'simparica',
            type: 'simparica',
            kind: 'complete',
            message: "Pepper's Simparica Trio is due.",
            onComplete: handleCompleteSimparica,
        })
    }

    if (isGroomingDue && !dismissed.has('grooming-due')) {
        const lastGrooming = getLastCompletedDate('grooming')
        const weeksAgo = lastGrooming
            ? Math.round((Date.now() - lastGrooming.getTime()) / (1000 * 60 * 60 * 24 * 7))
            : 0
        alerts.push({
            id: 'grooming-due',
            type: 'grooming',
            kind: 'schedule',
            message: `Grooming is due${lastGrooming ? `, last done ${weeksAgo} weeks ago` : ''}.`,
            onSchedule: handleScheduleGrooming,
        })
    }

    if (groomingAppointmentReminder && !dismissed.has(groomingAppointmentReminder.id)) {
        const appointmentAt = parseISO(groomingAppointmentReminder.appointment_at!)
        let message = `Pepper has a grooming appointment on ${format(appointmentAt, "MMM d 'at' h:mm a")}.`

        if (isToday(appointmentAt)) {
            message = `Pepper has a grooming appointment today at ${format(appointmentAt, 'h:mm a')}.`
        } else if (isTomorrow(appointmentAt)) {
            message = `Pepper has a grooming appointment tomorrow at ${format(appointmentAt, 'h:mm a')}.`
        } else if (appointmentAt.getTime() < Date.now()) {
            message = `Pepper's grooming appointment was ${format(appointmentAt, "MMM d 'at' h:mm a")}. Mark it completed.`
        }

        alerts.push({
            id: groomingAppointmentReminder.id,
            type: 'grooming',
            kind: 'complete',
            message,
            actionLabel: 'Complete',
            onComplete: async (completedBy) => {
                setCompleting(groomingAppointmentReminder.id)
                try {
                    await completeReminder(groomingAppointmentReminder.id, completedBy)
                } finally {
                    setCompleting(null)
                    setActiveAction(null)
                }
            },
        })
    }

    overdueReminders.forEach((reminder) => {
        if (!dismissed.has(reminder.id)) {
            alerts.push({
                id: reminder.id,
                type: reminder.type,
                kind: 'complete',
                message: `${REMINDER_CONFIG[reminder.type].label} was due on ${format(parseISO(reminder.due_date), 'MMM d')}.`,
                onComplete: async (completedBy) => {
                    setCompleting(reminder.id)
                    try {
                        await completeReminder(reminder.id, completedBy)
                    } finally {
                        setCompleting(null)
                        setActiveAction(null)
                    }
                },
            })
        }
    })

    if (alerts.length === 0) return null

    return (
        <div className="space-y-3">
            {alerts.map((alert) => {
                const config = REMINDER_CONFIG[alert.type]
                const isScheduleAction = alert.kind === 'schedule'

                return (
                    <div
                        key={alert.id}
                        className={`rounded-[1.55rem] border p-4 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)] ${config.color}`}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-white/75 p-2.5 shadow-sm">
                                        {config.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] opacity-75">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            {config.label}
                                        </div>
                                        <p className="mt-1 text-sm font-medium leading-6">{alert.message}</p>
                                    </div>
                                </div>

                                {activeAction !== alert.id ? (
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        onClick={() => handleDismiss(alert.id)}
                                        className="rounded-full"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                ) : null}
                            </div>

                            {isReadOnly ? (
                                <div className="inline-flex w-fit rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    Read only
                                </div>
                            ) : activeAction === alert.id ? (
                                <div className="space-y-3 rounded-[1.35rem] border border-white/70 bg-white/65 p-3">
                                    {isScheduleAction ? (
                                        <label className="space-y-1">
                                            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                Appointment time
                                            </span>
                                            <input
                                                type="datetime-local"
                                                value={appointmentInput}
                                                onChange={(e) => setAppointmentInput(e.target.value)}
                                                className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </label>
                                    ) : null}

                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {FAMILY_ORDER.map((member) => (
                                            <button
                                                key={member}
                                                onClick={() =>
                                                    isScheduleAction
                                                        ? alert.onSchedule(
                                                              member,
                                                              parse(appointmentInput, "yyyy-MM-dd'T'HH:mm", new Date())
                                                          )
                                                        : alert.onComplete(member)
                                                }
                                                disabled={completing === alert.id || completing === 'grooming'}
                                                className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 text-left transition-colors hover:bg-stone-50 disabled:opacity-70"
                                            >
                                                <FamilyAvatar userName={member} size="sm" />
                                                <span className="text-sm font-medium text-foreground">
                                                    {completing === alert.id || completing === 'grooming' ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        member
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setActiveAction(null)}
                                        className="rounded-full"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            if (isScheduleAction) {
                                                setAppointmentInput(createDefaultAppointmentInput())
                                            }
                                            setActiveAction(alert.id)
                                        }}
                                        disabled={isLoading}
                                        className="rounded-full bg-white/80"
                                    >
                                        {isScheduleAction ? (
                                            <>
                                                <Calendar className="mr-1 h-4 w-4" />
                                                Schedule
                                            </>
                                        ) : (
                                            <>
                                                <Check className="mr-1 h-4 w-4" />
                                                {alert.actionLabel ?? 'Mark done'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

'use client'

import { useRef, useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
import { SaveFeedback } from '@/components/save-feedback'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, Check, Loader2, X, Pill, Scissors, Stethoscope } from 'lucide-react'
import { addDays, format, isToday, isTomorrow, parse, parseISO } from 'date-fns'

const USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']
const DEFAULT_APPOINTMENT_HOUR = 10

function createDefaultAppointmentInput() {
    const defaultAppointment = addDays(new Date(), 1)
    defaultAppointment.setHours(DEFAULT_APPOINTMENT_HOUR, 0, 0, 0)
    return format(defaultAppointment, "yyyy-MM-dd'T'HH:mm")
}

const REMINDER_CONFIG: Record<ReminderType, { icon: React.ReactNode; label: string; color: string }> = {
    simparica: {
        icon: <Pill className="w-5 h-5" />,
        label: 'Simparica Trio',
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/30'
    },
    grooming: {
        icon: <Scissors className="w-5 h-5" />,
        label: 'Grooming',
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/30'
    },
    vet: {
        icon: <Stethoscope className="w-5 h-5" />,
        label: 'Vet Appointment',
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/30'
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
        error,
        refetch,
    } = useReminders()

    const [activeAction, setActiveAction] = useState<string | null>(null)
    const saving = useRef(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [completing, setCompleting] = useState<string | null>(null)
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())
    const [appointmentInput, setAppointmentInput] = useState<string>(createDefaultAppointmentInput)

    const handleCompleteSimparica = async (completedBy: UserName) => {
        if (!user || isReadOnly || saving.current || isLoading || error) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setCompleting('simparica')
        try {
            const today = new Date()
            await addReminder('simparica', today, undefined, completedBy)

            setActiveAction(null)
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setCompleting(null)
        }
    }

    const handleScheduleGrooming = async (scheduledBy: UserName, appointmentAt: Date) => {
        if (!user || isReadOnly || saving.current || isLoading || error) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setCompleting('grooming')
        try {
            await scheduleReminder('grooming', appointmentAt, scheduledBy)

            setActiveAction(null)
            setAppointmentInput(createDefaultAppointmentInput())
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setCompleting(null)
        }
    }

    const handleDismiss = (type: string) => {
        setDismissed(prev => new Set([...prev, type]))
    }

    // Build alerts list
    const alerts: BannerAlert[] = []

    if (isSimparicaDue && !dismissed.has('simparica')) {
        alerts.push({
            id: 'simparica',
            type: 'simparica',
            kind: 'complete',
            message: "Pepper's Simparica Trio is due!",
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
            message: `Grooming is due (last: ${weeksAgo} weeks ago)`,
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
                if (isReadOnly || saving.current || isLoading || error) return
                saving.current = true
                setSaveError(null)
                setSaved(false)
                setCompleting(groomingAppointmentReminder.id)
                try {
                    await completeReminder(groomingAppointmentReminder.id, completedBy)

                    setActiveAction(null)
                    setSaved(true)
                } catch (err) {
                    setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
                } finally {
                    saving.current = false
                    setCompleting(null)
                }
            },
        })
    }

    // Add overdue reminders
    overdueReminders.forEach(reminder => {
        if (!dismissed.has(reminder.id)) {
            alerts.push({
                id: reminder.id,
                type: reminder.type,
                kind: 'complete',
                message: `${REMINDER_CONFIG[reminder.type].label} was due on ${format(parseISO(reminder.due_date), 'MMM d')}`,
                onComplete: async (completedBy) => {
                    if (isReadOnly || saving.current || isLoading || error) return
                    saving.current = true
                    setSaveError(null)
                    setSaved(false)
                    setCompleting(reminder.id)
                    try {
                        await completeReminder(reminder.id, completedBy)

                        setActiveAction(null)
                        setSaved(true)
                    } catch (err) {
                        setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
                    } finally {
                        saving.current = false
                        setCompleting(null)
                    }
                },
            })
        }
    })


    return (
        <section aria-label="Due care" aria-busy={isLoading} className="min-h-24 space-y-2">
            <h2 className="font-sans text-base font-semibold">Due care</h2>
            {isLoading ? <p role="status" className="text-sm text-muted-foreground">Checking due care...</p> : !error && alerts.length === 0 ? <p className="text-sm text-muted-foreground">No care alerts to show. See Care Schedule for appointments.</p> : null}
            {error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <p>{error}</p>
                <Button variant="outline" className="mt-2" disabled={isLoading} onClick={() => void refetch()}>Retry care alerts</Button>
            </div> : null}
            <SaveFeedback error={saveError} saved={saved} />
            {completing ? <p role="status" className="text-sm text-muted-foreground">Saving reminder...</p> : null}
            {alerts.map(alert => {
                const config = REMINDER_CONFIG[alert.type]

                return (
                    <div
                        key={alert.id}
                        className={`rounded-xl border p-4 ${config.color}`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-background/50">
                                    {config.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-medium text-sm">{alert.message}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {isReadOnly ? (
                                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Read only
                                    </span>
                                ) : activeAction === alert.id ? (
                                    <div className="flex flex-wrap gap-2">
                                        {alert.kind === 'schedule' ? (
                                            <div className="flex min-w-0 max-w-full flex-col gap-2">
                                                <label className="min-w-0 space-y-1 text-sm">
                                                    <span className="block">Grooming appointment date and time</span>
                                                    <input
                                                        aria-label="Grooming appointment date and time"
                                                        disabled={Boolean(completing) || isLoading || Boolean(error)}
                                                        type="datetime-local"
                                                        value={appointmentInput}
                                                        onChange={(e) => setAppointmentInput(e.target.value)}
                                                        className="min-h-11 min-w-0 w-full max-w-full px-2 text-base border rounded bg-background"
                                                    />
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {USERS.map(u => (
                                                        <Button
                                                            key={u}
                                                            aria-label={u}
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => alert.onSchedule(u, parse(appointmentInput, "yyyy-MM-dd'T'HH:mm", new Date()))}
                                                            disabled={Boolean(completing) || isLoading || Boolean(error)}
                                                            className="text-sm px-3 min-h-11 min-w-11 bg-background"
                                                        >
                                                            {completing === 'grooming' ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                u
                                                            )}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            USERS.map(u => (
                                                <Button
                                                    key={u}
                                                    aria-label={u}
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => alert.onComplete(u)}
                                                    disabled={Boolean(completing) || isLoading || Boolean(error)}
                                                    className="text-sm px-3 min-h-11 min-w-11 bg-background"
                                                >
                                                    {completing === alert.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        u
                                                    )}
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                if (alert.kind === 'schedule') {
                                                    setAppointmentInput(createDefaultAppointmentInput())
                                                }
                                                setActiveAction(alert.id)
                                            }}
                                            disabled={isLoading || Boolean(error)}
                                            className="bg-background"
                                        >
                                            {alert.kind === 'schedule' ? (
                                                <>
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    Schedule
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-1" />
                                                    {alert.actionLabel ?? 'Done'}
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            aria-label="Dismiss reminder"
                                            disabled={Boolean(completing)}
                                            onClick={() => handleDismiss(alert.id)}
                                            className="p-2 min-h-11 min-w-11"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </section>
    )
}

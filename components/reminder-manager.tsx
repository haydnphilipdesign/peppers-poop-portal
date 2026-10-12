'use client'

import { useRef, useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
import { SaveFeedback } from '@/components/save-feedback'
import { Button } from '@/components/ui/button'
import { Calendar, Scissors, Stethoscope, Plus, Loader2, Check } from 'lucide-react'
import { format, addDays, addWeeks, isBefore, parse } from 'date-fns'

const USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']
const DEFAULT_APPOINTMENT_HOUR = 10

function createDefaultAppointmentInput() {
    const defaultAppointment = addDays(new Date(), 1)
    defaultAppointment.setHours(DEFAULT_APPOINTMENT_HOUR, 0, 0, 0)
    return format(defaultAppointment, "yyyy-MM-dd'T'HH:mm")
}

export function ReminderManager() {
    const { user } = useUser()
    const isReadOnly = useReadOnly()
    const {
        getLastCompletedDate,
        addReminder,
        scheduleReminder,
        completeReminder,
        activeGroomingReminder,
        activeVetReminder,
        isLoading,
        hasLoaded,
        error,
        refetch,
    } = useReminders()

    const saving = useRef(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [logging, setLogging] = useState<ReminderType | null>(null)
    const [showAssignee, setShowAssignee] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [appointmentInput, setAppointmentInput] = useState<string>(createDefaultAppointmentInput)

    const lastGrooming = getLastCompletedDate('grooming')
    const lastVet = getLastCompletedDate('vet')
    const groomingAppointment = activeGroomingReminder?.appointment_at
        ? new Date(activeGroomingReminder.appointment_at)
        : null
    const vetAppointment = activeVetReminder?.appointment_at
        ? new Date(activeVetReminder.appointment_at)
        : null

    const handleLogReminder = async (type: ReminderType, assignedTo: UserName) => {
        if (!user || isReadOnly || isLoading || Boolean(error) || saving.current) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setLogging(type)
        try {
            const dateToLog = parse(selectedDate, 'yyyy-MM-dd', new Date())
            const completedAt = new Date(dateToLog)
            completedAt.setHours(12, 0, 0, 0)

            await addReminder(type, dateToLog, undefined, assignedTo, completedAt)

            setShowAssignee(null)
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setLogging(null)
        }
    }

    const handleScheduleGrooming = async (scheduledBy: UserName) => {
        if (!user || isReadOnly || isLoading || Boolean(error) || saving.current) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setLogging('grooming')
        try {
            const appointmentAt = parse(appointmentInput, "yyyy-MM-dd'T'HH:mm", new Date())
            await scheduleReminder('grooming', appointmentAt, scheduledBy)

            setShowAssignee(null)
            setAppointmentInput(createDefaultAppointmentInput())
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setLogging(null)
        }
    }

    const handleCompleteScheduledGrooming = async (completedBy: UserName) => {
        if (!user || isReadOnly || isLoading || Boolean(error) || saving.current || !activeGroomingReminder) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setLogging('grooming')
        try {
            await completeReminder(activeGroomingReminder.id, completedBy)

            setShowAssignee(null)
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setLogging(null)
        }
    }

    const handleScheduleVet = async (scheduledBy: UserName) => {
        if (!user || isReadOnly || isLoading || Boolean(error) || saving.current) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setLogging('vet')
        try {
            const appointmentAt = parse(appointmentInput, "yyyy-MM-dd'T'HH:mm", new Date())
            await scheduleReminder('vet', appointmentAt, scheduledBy)

            setShowAssignee(null)
            setAppointmentInput(createDefaultAppointmentInput())
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setLogging(null)
        }
    }

    const handleCompleteScheduledVet = async (completedBy: UserName) => {
        if (!user || isReadOnly || isLoading || Boolean(error) || saving.current || !activeVetReminder) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setLogging('vet')
        try {
            await completeReminder(activeVetReminder.id, completedBy)

            setShowAssignee(null)
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setLogging(null)
        }
    }

    const openGroomingSchedule = () => {
        setAppointmentInput(
            groomingAppointment
                ? format(groomingAppointment, "yyyy-MM-dd'T'HH:mm")
                : createDefaultAppointmentInput()
        )
        setShowAssignee('grooming-schedule')
    }

    const openVetSchedule = () => {
        setAppointmentInput(
            vetAppointment
                ? format(vetAppointment, "yyyy-MM-dd'T'HH:mm")
                : createDefaultAppointmentInput()
        )
        setShowAssignee('vet-schedule')
    }

    const groomingStatusCopy = (() => {
        if (isLoading && !hasLoaded) return 'Loading...'
        if (groomingAppointment) {
            const appointmentLabel = format(groomingAppointment, "MMM d, yyyy 'at' h:mm a")
            const isPastAppointment = isBefore(groomingAppointment, new Date())
            return isPastAppointment
                ? `Appointment was scheduled for ${appointmentLabel}`
                : `Scheduled for ${appointmentLabel}`
        }
        if (lastGrooming) {
            return `Last: ${format(lastGrooming, 'MMM d, yyyy')}`
        }
        return 'Not yet logged'
    })()

    const vetStatusCopy = (() => {
        if (isLoading && !hasLoaded) return 'Loading...'
        if (vetAppointment) {
            const appointmentLabel = format(vetAppointment, "MMM d, yyyy 'at' h:mm a")
            const isPastAppointment = isBefore(vetAppointment, new Date())
            return isPastAppointment
                ? `Appointment was scheduled for ${appointmentLabel}`
                : `Scheduled for ${appointmentLabel}`
        }
        if (lastVet) {
            return `Last: ${format(lastVet, 'MMM d, yyyy')}`
        }
        return 'Not yet logged'
    })()

    return (
        <section className="rounded-xl border border-border/70 bg-card">
            <button
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="min-h-11 w-full px-4 py-3 text-left font-medium"
            >
                <span aria-hidden="true">{expanded ? '▼' : '▶'} </span>
                <span>Care Schedule</span>
            </button>

            {error ? (
                <div role="alert" className="mx-3 mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                    <p>{error}</p>
                    <Button variant="outline" className="mt-2" disabled={isLoading} onClick={() => void refetch()}>Retry reminders</Button>
                </div>
            ) : null}
            <SaveFeedback error={saveError} saved={saved} />
            {logging ? <p role="status" className="text-sm text-muted-foreground">Saving reminder...</p> : isLoading && hasLoaded ? <p role="status" className="text-sm text-muted-foreground">Refreshing reminders...</p> : null}
            {expanded && (hasLoaded || !error) && (
                <div className="space-y-2 px-3 pb-3">
                    {/* Grooming */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Scissors className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Grooming</p>
                                    <p className="text-sm text-muted-foreground">{groomingStatusCopy}</p>
                                    {activeGroomingReminder?.scheduled_by ? (
                                        <p className="text-sm text-muted-foreground">
                                            Scheduled by {activeGroomingReminder.scheduled_by}
                                        </p>
                                    ) : null}
                                    {lastGrooming && !groomingAppointment && (
                                        <p className="text-sm text-muted-foreground">
                                            Next: ~{format(addWeeks(lastGrooming, 6), 'MMM d')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {isReadOnly ? null : showAssignee === 'grooming-schedule' ? (
                                <div className="flex min-w-0 w-full max-w-full flex-col gap-2">
                                    <label className="min-w-0 space-y-1 text-sm">
                                        <span className="block">Appointment date and time</span>
                                        <input
                                            aria-label="Appointment date and time"
                                            disabled={Boolean(logging) || isLoading || Boolean(error)}
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
                                                onClick={() => handleScheduleGrooming(u)}
                                                disabled={Boolean(logging) || isLoading || Boolean(error)}
                                                className="text-sm px-3 min-h-11 min-w-11"
                                            >
                                                {logging === 'grooming' ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    u
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : showAssignee === 'grooming-complete' ? (
                                <div className="flex flex-wrap gap-2">
                                    {USERS.map(u => (
                                        <Button
                                            key={u}
                                            aria-label={u}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCompleteScheduledGrooming(u)}
                                            disabled={Boolean(logging) || isLoading || Boolean(error)}
                                            className="text-sm px-3 min-h-11 min-w-11"
                                        >
                                            {logging === 'grooming' ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                u
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            ) : showAssignee === 'grooming-log' ? (
                                <div className="flex min-w-0 w-full max-w-full flex-col gap-2">
                                    <label className="min-w-0 space-y-1 text-sm">
                                        <span className="block">Completed date</span>
                                        <input
                                            aria-label="Completed date"
                                            disabled={Boolean(logging) || isLoading || Boolean(error)}
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="min-h-11 min-w-0 w-full max-w-full px-2 text-base border rounded bg-background"
                                            max={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {USERS.map(u => (
                                            <Button
                                                key={u}
                                                aria-label={u}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleLogReminder('grooming', u)}
                                                disabled={Boolean(logging) || isLoading || Boolean(error)}
                                                className="text-sm px-3 min-h-11 min-w-11"
                                            >
                                                {logging === 'grooming' ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    u
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={openGroomingSchedule}
                                        disabled={Boolean(logging) || isLoading || Boolean(error)}
                                    >
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {groomingAppointment ? 'Reschedule' : 'Schedule'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowAssignee(groomingAppointment ? 'grooming-complete' : 'grooming-log')}
                                        disabled={Boolean(logging) || isLoading || Boolean(error)}
                                    >
                                        {groomingAppointment ? (
                                            <>
                                                <Check className="w-4 h-4 mr-1" />
                                                Complete
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-1" />
                                                Log Completed
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vet */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Vet Visit</p>
                                    <p className="text-sm text-muted-foreground">{vetStatusCopy}</p>
                                    {activeVetReminder?.scheduled_by ? (
                                        <p className="text-sm text-muted-foreground">
                                            Scheduled by {activeVetReminder.scheduled_by}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {isReadOnly ? null : showAssignee === 'vet-schedule' ? (
                                <div className="flex min-w-0 w-full max-w-full flex-col gap-2">
                                    <label className="min-w-0 space-y-1 text-sm">
                                        <span className="block">Appointment date and time</span>
                                        <input
                                            aria-label="Appointment date and time"
                                            disabled={Boolean(logging) || isLoading || Boolean(error)}
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
                                                onClick={() => handleScheduleVet(u)}
                                                disabled={Boolean(logging) || isLoading || Boolean(error)}
                                                className="text-sm px-3 min-h-11 min-w-11"
                                            >
                                                {logging === 'vet' ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    u
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : showAssignee === 'vet-complete' ? (
                                <div className="flex flex-wrap gap-2">
                                    {USERS.map(u => (
                                        <Button
                                            key={u}
                                            aria-label={u}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCompleteScheduledVet(u)}
                                            disabled={Boolean(logging) || isLoading || Boolean(error)}
                                            className="text-sm px-3 min-h-11 min-w-11"
                                        >
                                            {logging === 'vet' ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                u
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            ) : showAssignee === 'vet-log' ? (
                                <div className="flex min-w-0 w-full max-w-full flex-col gap-2">
                                    <label className="min-w-0 space-y-1 text-sm">
                                        <span className="block">Completed date</span>
                                        <input
                                            aria-label="Completed date"
                                            disabled={Boolean(logging) || isLoading || Boolean(error)}
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="min-h-11 min-w-0 w-full max-w-full px-2 text-base border rounded bg-background"
                                            max={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {USERS.map(u => (
                                            <Button
                                                key={u}
                                                aria-label={u}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleLogReminder('vet', u)}
                                                disabled={Boolean(logging) || isLoading || Boolean(error)}
                                                className="text-sm px-3 min-h-11 min-w-11"
                                            >
                                                {logging === 'vet' ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    u
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={openVetSchedule}
                                        disabled={Boolean(logging) || isLoading || Boolean(error)}
                                    >
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {vetAppointment ? 'Reschedule' : 'Schedule'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowAssignee(vetAppointment ? 'vet-complete' : 'vet-log')}
                                        disabled={Boolean(logging) || isLoading || Boolean(error)}
                                    >
                                        {vetAppointment ? (
                                            <>
                                                <Check className="w-4 h-4 mr-1" />
                                                Complete
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-1" />
                                                Log Completed
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Simparica Info */}
                    <div className="rounded-xl border border-border bg-card/50 p-4">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Calendar className="w-5 h-5" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Simparica Trio</p>
                                <p className="text-xs">
                                    Due on the 20th of every month — you&apos;ll see a reminder when it&apos;s time
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

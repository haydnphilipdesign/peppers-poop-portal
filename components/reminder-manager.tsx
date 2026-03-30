'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
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
        isLoading
    } = useReminders()

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

    const handleLogReminder = async (type: ReminderType, assignedTo: UserName) => {
        if (!user) return

        setLogging(type)
        try {
            const dateToLog = parse(selectedDate, 'yyyy-MM-dd', new Date())
            const completedAt = new Date(dateToLog)
            completedAt.setHours(12, 0, 0, 0)

            await addReminder(type, dateToLog, undefined, assignedTo, completedAt)
        } finally {
            setLogging(null)
            setShowAssignee(null)
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
        }
    }

    const handleScheduleGrooming = async (scheduledBy: UserName) => {
        if (!user) return

        setLogging('grooming')
        try {
            const appointmentAt = parse(appointmentInput, "yyyy-MM-dd'T'HH:mm", new Date())
            await scheduleReminder('grooming', appointmentAt, scheduledBy)
        } finally {
            setLogging(null)
            setShowAssignee(null)
            setAppointmentInput(createDefaultAppointmentInput())
        }
    }

    const handleCompleteScheduledGrooming = async (completedBy: UserName) => {
        if (!user || !activeGroomingReminder) return

        setLogging('grooming')
        try {
            await completeReminder(activeGroomingReminder.id, completedBy)
        } finally {
            setLogging(null)
            setShowAssignee(null)
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

    const groomingStatusCopy = (() => {
        if (isLoading) return 'Loading...'
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

    return (
        <section className="space-y-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            >
                <span>📅 Care Schedule</span>
                <span className="text-xs lowercase font-normal">
                    {expanded ? 'collapse' : 'expand'}
                </span>
            </button>

            {expanded && (
                <div className="space-y-2">
                    {/* Grooming */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Scissors className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Grooming</p>
                                    <p className="text-xs text-muted-foreground">{groomingStatusCopy}</p>
                                    {activeGroomingReminder?.scheduled_by ? (
                                        <p className="text-xs text-muted-foreground">
                                            Scheduled by {activeGroomingReminder.scheduled_by}
                                        </p>
                                    ) : null}
                                    {lastGrooming && !groomingAppointment && (
                                        <p className="text-xs text-muted-foreground">
                                            Next: ~{format(addWeeks(lastGrooming, 6), 'MMM d')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {isReadOnly ? null : showAssignee === 'grooming-schedule' ? (
                                <div className="flex flex-col gap-2 items-end">
                                    <input
                                        type="datetime-local"
                                        value={appointmentInput}
                                        onChange={(e) => setAppointmentInput(e.target.value)}
                                        className="h-7 px-2 text-xs border rounded bg-background"
                                    />
                                    <div className="flex gap-1">
                                        {USERS.map(u => (
                                            <Button
                                                key={u}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleScheduleGrooming(u)}
                                                disabled={logging === 'grooming'}
                                                className="text-xs px-2 py-1 h-7"
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
                                <div className="flex gap-1">
                                    {USERS.map(u => (
                                        <Button
                                            key={u}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCompleteScheduledGrooming(u)}
                                            disabled={logging === 'grooming'}
                                            className="text-xs px-2 py-1 h-7"
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
                                <div className="flex flex-col gap-2 items-end">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="h-7 px-2 text-xs border rounded bg-background"
                                        max={format(new Date(), 'yyyy-MM-dd')}
                                    />
                                    <div className="flex gap-1">
                                        {USERS.map(u => (
                                            <Button
                                                key={u}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleLogReminder('grooming', u)}
                                                disabled={logging === 'grooming'}
                                                className="text-xs px-2 py-1 h-7"
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
                                        disabled={isLoading}
                                    >
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {groomingAppointment ? 'Reschedule' : 'Schedule'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowAssignee(groomingAppointment ? 'grooming-complete' : 'grooming-log')}
                                        disabled={isLoading}
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Vet Visit</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isLoading
                                            ? 'Loading...'
                                            : lastVet
                                            ? `Last: ${format(lastVet, 'MMM d, yyyy')}`
                                            : 'Not yet logged'
                                        }
                                    </p>
                                </div>
                            </div>

                            {isReadOnly ? null : showAssignee === 'vet' ? (
                                <div className="flex flex-col gap-2 items-end">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="h-7 px-2 text-xs border rounded bg-background"
                                        max={format(new Date(), 'yyyy-MM-dd')}
                                    />
                                    <div className="flex gap-1">
                                        {USERS.map(u => (
                                            <Button
                                                key={u}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleLogReminder('vet', u)}
                                                disabled={logging === 'vet'}
                                                className="text-xs px-2 py-1 h-7"
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
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setShowAssignee('vet')}
                                    disabled={isLoading}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Log
                                </Button>
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

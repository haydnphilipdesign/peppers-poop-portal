'use client'

import { useState } from 'react'
import { FamilyAvatar } from '@/components/family-avatar'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { FAMILY_ORDER } from '@/lib/family'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDays, Check, ChevronDown, Loader2, Plus, Scissors, Stethoscope } from 'lucide-react'
import { addDays, addWeeks, format, isBefore, parse } from 'date-fns'

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
        isLoading,
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
            return `Last completed ${format(lastGrooming, 'MMM d, yyyy')}`
        }
        return 'Not yet logged'
    })()

    return (
        <section className="space-y-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between rounded-[1.4rem] border border-border/80 bg-white/70 px-4 py-3 text-left shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)] transition-colors hover:bg-white"
            >
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Care schedule</p>
                    <p className="mt-1 text-base font-semibold text-foreground">Appointments and health reminders</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {expanded ? (
                <div className="space-y-3">
                    <ReminderCard
                        icon={<Scissors className="h-5 w-5" />}
                        iconClassName="bg-sky-100 text-sky-900"
                        title="Grooming"
                        description={groomingStatusCopy}
                        detail={
                            activeGroomingReminder?.scheduled_by
                                ? `Scheduled by ${activeGroomingReminder.scheduled_by}`
                                : lastGrooming && !groomingAppointment
                                    ? `Suggested next visit: ${format(addWeeks(lastGrooming, 6), 'MMM d')}`
                                    : undefined
                        }
                    >
                        {isReadOnly ? null : showAssignee === 'grooming-schedule' ? (
                            <ReminderPicker
                                label="Appointment time"
                                input={
                                    <input
                                        type="datetime-local"
                                        value={appointmentInput}
                                        onChange={(e) => setAppointmentInput(e.target.value)}
                                        className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                }
                            >
                                <FamilyPicker
                                    loading={logging === 'grooming'}
                                    onPick={(member) => void handleScheduleGrooming(member)}
                                />
                            </ReminderPicker>
                        ) : showAssignee === 'grooming-complete' ? (
                            <ReminderPicker>
                                <FamilyPicker
                                    loading={logging === 'grooming'}
                                    onPick={(member) => void handleCompleteScheduledGrooming(member)}
                                />
                            </ReminderPicker>
                        ) : showAssignee === 'grooming-log' ? (
                            <ReminderPicker
                                label="Completed on"
                                input={
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        max={format(new Date(), 'yyyy-MM-dd')}
                                    />
                                }
                            >
                                <FamilyPicker
                                    loading={logging === 'grooming'}
                                    onPick={(member) => void handleLogReminder('grooming', member)}
                                />
                            </ReminderPicker>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={openGroomingSchedule}
                                    disabled={isLoading}
                                    className="rounded-full"
                                >
                                    <Calendar className="mr-1 h-4 w-4" />
                                    {groomingAppointment ? 'Reschedule' : 'Schedule'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowAssignee(groomingAppointment ? 'grooming-complete' : 'grooming-log')}
                                    disabled={isLoading}
                                    className="rounded-full"
                                >
                                    {groomingAppointment ? (
                                        <>
                                            <Check className="mr-1 h-4 w-4" />
                                            Complete
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-1 h-4 w-4" />
                                            Log completed
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </ReminderCard>

                    <ReminderCard
                        icon={<Stethoscope className="h-5 w-5" />}
                        iconClassName="bg-violet-100 text-violet-900"
                        title="Vet visit"
                        description={
                            isLoading
                                ? 'Loading...'
                                : lastVet
                                    ? `Last completed ${format(lastVet, 'MMM d, yyyy')}`
                                    : 'Not yet logged'
                        }
                    >
                        {isReadOnly ? null : showAssignee === 'vet' ? (
                            <ReminderPicker
                                label="Completed on"
                                input={
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        max={format(new Date(), 'yyyy-MM-dd')}
                                    />
                                }
                            >
                                <FamilyPicker
                                    loading={logging === 'vet'}
                                    onPick={(member) => void handleLogReminder('vet', member)}
                                />
                            </ReminderPicker>
                        ) : (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setShowAssignee('vet')}
                                disabled={isLoading}
                                className="rounded-full"
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                Log
                            </Button>
                        )}
                    </ReminderCard>

                    <div className="rounded-[1.5rem] border border-border/70 bg-white/70 p-4 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-900">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Simparica Trio</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Due on the 20th of every month. A reminder appears automatically when it&apos;s time.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    )
}

function ReminderCard({
    icon,
    iconClassName,
    title,
    description,
    detail,
    children,
}: {
    icon: React.ReactNode
    iconClassName: string
    title: string
    description: string
    detail?: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-[1.5rem] border border-border/70 bg-white/70 p-4 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className={`rounded-2xl p-2.5 ${iconClassName}`}>{icon}</div>
                    <div>
                        <p className="font-semibold text-foreground">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                    </div>
                </div>

                <div className="sm:max-w-[360px] sm:shrink-0">{children}</div>
            </div>
        </div>
    )
}

function ReminderPicker({
    label,
    input,
    children,
}: {
    label?: string
    input?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="space-y-3 rounded-[1.35rem] border border-border bg-stone-50/90 p-3">
            {label && input ? (
                <label className="space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {label}
                    </span>
                    {input}
                </label>
            ) : null}
            {children}
        </div>
    )
}

function FamilyPicker({
    loading,
    onPick,
}: {
    loading: boolean
    onPick: (member: UserName) => void
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-3">
            {FAMILY_ORDER.map((member) => (
                <button
                    key={member}
                    onClick={() => onPick(member)}
                    disabled={loading}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 text-left transition-colors hover:bg-stone-50 disabled:opacity-70"
                >
                    <FamilyAvatar userName={member} size="sm" />
                    <span className="text-sm font-medium text-foreground">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : member}
                    </span>
                </button>
            ))}
        </div>
    )
}

'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Calendar, Scissors, Stethoscope, Plus, Loader2 } from 'lucide-react'
import { format, addWeeks, parse } from 'date-fns'

const USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']

export function ReminderManager() {
    const { user } = useUser()
    const isReadOnly = useReadOnly()
    const {
        getLastCompletedDate,
        addReminder,
        isLoading
    } = useReminders()

    const [expanded, setExpanded] = useState(false)
    const [logging, setLogging] = useState<ReminderType | null>(null)
    const [showAssignee, setShowAssignee] = useState<ReminderType | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

    const lastGrooming = getLastCompletedDate('grooming')
    const lastVet = getLastCompletedDate('vet')

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
                                    <p className="text-xs text-muted-foreground">
                                        {lastGrooming
                                            ? `Last: ${format(lastGrooming, 'MMM d, yyyy')}`
                                            : 'Not yet logged'
                                        }
                                    </p>
                                    {lastGrooming && (
                                        <p className="text-xs text-muted-foreground">
                                            Next: ~{format(addWeeks(lastGrooming, 6), 'MMM d')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {isReadOnly ? null : showAssignee === 'grooming' ? (
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
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setShowAssignee('grooming')}
                                    disabled={isLoading}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Log
                                </Button>
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
                                        {lastVet
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

'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReminders } from '@/hooks/use-reminders'
import type { ReminderType, UserName } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Check, Loader2, X, Pill, Scissors, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'

const USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']

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

export function RemindersBanner() {
    const { user } = useUser()
    const {
        isSimparicaDue,
        isGroomingDue,
        overdueReminders,
        addReminder,
        completeReminder,
        getLastCompletedDate,
        isLoading
    } = useReminders()

    const [showAssignee, setShowAssignee] = useState<ReminderType | null>(null)
    const [completing, setCompleting] = useState<string | null>(null)
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())

    const handleCompleteSimparica = async (completedBy: UserName) => {
        if (!user) return

        setCompleting('simparica')
        try {
            const today = new Date()
            await addReminder('simparica', today, undefined, completedBy)
        } finally {
            setCompleting(null)
            setShowAssignee(null)
        }
    }

    const handleCompleteGrooming = async (completedBy: UserName) => {
        if (!user) return

        setCompleting('grooming')
        try {
            const today = new Date()
            await addReminder('grooming', today, undefined, completedBy)
        } finally {
            setCompleting(null)
            setShowAssignee(null)
        }
    }

    const handleDismiss = (type: string) => {
        setDismissed(prev => new Set([...prev, type]))
    }

    // Build alerts list
    const alerts: Array<{
        id: string
        type: ReminderType
        message: string
        onComplete: (user: UserName) => Promise<void>
    }> = []

    if (isSimparicaDue && !dismissed.has('simparica')) {
        alerts.push({
            id: 'simparica',
            type: 'simparica',
            message: "Pepper's Simparica Trio is due!",
            onComplete: handleCompleteSimparica,
        })
    }

    if (isGroomingDue && !dismissed.has('grooming')) {
        const lastGrooming = getLastCompletedDate('grooming')
        const weeksAgo = lastGrooming
            ? Math.round((Date.now() - lastGrooming.getTime()) / (1000 * 60 * 60 * 24 * 7))
            : 0
        alerts.push({
            id: 'grooming',
            type: 'grooming',
            message: `Grooming is due (last: ${weeksAgo} weeks ago)`,
            onComplete: handleCompleteGrooming,
        })
    }

    // Add overdue reminders
    overdueReminders.forEach(reminder => {
        if (!dismissed.has(reminder.id)) {
            alerts.push({
                id: reminder.id,
                type: reminder.type,
                message: `${REMINDER_CONFIG[reminder.type].label} was due on ${format(new Date(reminder.due_date), 'MMM d')}`,
                onComplete: async (completedBy) => {
                    setCompleting(reminder.id)
                    try {
                        await completeReminder(reminder.id, completedBy)
                    } finally {
                        setCompleting(null)
                        setShowAssignee(null)
                    }
                },
            })
        }
    })

    if (alerts.length === 0) return null

    return (
        <div className="space-y-2">
            {alerts.map(alert => {
                const config = REMINDER_CONFIG[alert.type]

                return (
                    <div
                        key={alert.id}
                        className={`rounded-xl border p-4 ${config.color}`}
                    >
                        <div className="flex items-start justify-between gap-3">
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

                            <div className="flex items-center gap-1">
                                {showAssignee === alert.type ? (
                                    <div className="flex gap-1">
                                        {USERS.map(u => (
                                            <Button
                                                key={u}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => alert.onComplete(u)}
                                                disabled={completing === alert.id}
                                                className="text-xs px-2 py-1 h-7 bg-background"
                                            >
                                                {completing === alert.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    u
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setShowAssignee(alert.type)}
                                            disabled={isLoading}
                                            className="bg-background"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Done
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDismiss(alert.id)}
                                            className="p-1 h-7 w-7"
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
        </div>
    )
}

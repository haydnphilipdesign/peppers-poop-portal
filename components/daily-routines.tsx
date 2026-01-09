'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useActivities } from '@/hooks/use-activities'
import type { ActivityType, UserName } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'

const USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']

export function DailyRoutines() {
    const { user } = useUser()
    const isReadOnly = useReadOnly()
    const {
        isToysFilled,
        isDinnerDone,
        toysFilledBy,
        dinnerDoneBy,
        logActivity,
        isLoading
    } = useActivities()

    const [showToysAssignee, setShowToysAssignee] = useState(false)
    const [showDinnerAssignee, setShowDinnerAssignee] = useState(false)
    const [loggingType, setLoggingType] = useState<ActivityType | null>(null)

    const handleLog = async (type: ActivityType, assignedTo: UserName) => {
        if (!user) return

        setLoggingType(type)
        try {
            await logActivity(type, user, assignedTo)
        } finally {
            setLoggingType(null)
            setShowToysAssignee(false)
            setShowDinnerAssignee(false)
        }
    }

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const isDinnerTime = currentHour > 17 || (currentHour === 17 && currentMinute >= 45)

    return (
        <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                🏠 Daily Routines
            </h2>

            <div className="space-y-2">
                {/* Toys */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🧸</span>
                            <div>
                                <p className="font-medium text-foreground">Fill Toys</p>
                                <p className="text-xs text-muted-foreground">Morning treats</p>
                            </div>
                        </div>

                        {isToysFilled ? (
                            <div className="flex items-center gap-2 text-green-500">
                                <Check className="w-5 h-5" />
                                <span className="text-sm font-medium">{toysFilledBy}</span>
                            </div>
                        ) : isReadOnly ? (
                            <span className="text-sm text-muted-foreground">Not done yet</span>
                        ) : showToysAssignee ? (
                            <div className="flex gap-1">
                                {USERS.map(u => (
                                    <Button
                                        key={u}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleLog('toys', u)}
                                        disabled={loggingType === 'toys'}
                                        className="text-xs px-2 py-1 h-7"
                                    >
                                        {loggingType === 'toys' ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            u
                                        )}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setShowToysAssignee(true)}
                                disabled={isLoading}
                            >
                                Log
                            </Button>
                        )}
                    </div>
                </div>

                {/* Dinner */}
                <div className={`rounded-xl border bg-card p-4 ${isDinnerTime && !isDinnerDone
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-border'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🍽️</span>
                            <div>
                                <p className="font-medium text-foreground">Make Dinner</p>
                                <p className="text-xs text-muted-foreground">
                                    {isDinnerTime && !isDinnerDone ? (
                                        <span className="text-amber-500">Due at 5:45 PM</span>
                                    ) : (
                                        '5:45 PM'
                                    )}
                                </p>
                            </div>
                        </div>

                        {isDinnerDone ? (
                            <div className="flex items-center gap-2 text-green-500">
                                <Check className="w-5 h-5" />
                                <span className="text-sm font-medium">{dinnerDoneBy}</span>
                            </div>
                        ) : isReadOnly ? (
                            <span className="text-sm text-muted-foreground">Not done yet</span>
                        ) : showDinnerAssignee ? (
                            <div className="flex gap-1">
                                {USERS.map(u => (
                                    <Button
                                        key={u}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleLog('dinner', u)}
                                        disabled={loggingType === 'dinner'}
                                        className="text-xs px-2 py-1 h-7"
                                    >
                                        {loggingType === 'dinner' ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            u
                                        )}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setShowDinnerAssignee(true)}
                                disabled={isLoading}
                            >
                                Log
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

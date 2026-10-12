'use client'

import { useRef, useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useActivities } from '@/hooks/use-activities'
import type { ActivityType, UserName } from '@/lib/database.types'
import { SaveFeedback } from '@/components/save-feedback'
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
        isLoading,
        hasLoaded,
        error,
        refetch,
    } = useActivities()

    const saving = useRef(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [showToysAssignee, setShowToysAssignee] = useState(false)
    const [showDinnerAssignee, setShowDinnerAssignee] = useState(false)
    const [loggingType, setLoggingType] = useState<ActivityType | null>(null)

    const handleLog = async (type: ActivityType, assignedTo: UserName) => {
        if (!user || isReadOnly || isLoading || Boolean(error) || saving.current) return

        saving.current = true
        setSaveError(null)
        setSaved(false)
        setLoggingType(type)
        try {
            await logActivity(type, user, assignedTo)

            setShowToysAssignee(false)
            setShowDinnerAssignee(false)
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setLoggingType(null)
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

            {error ? (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                    <p>{error}</p>
                    <Button variant="outline" className="mt-2" disabled={isLoading} onClick={() => void refetch()}>Retry routines</Button>
                </div>
            ) : null}
            <SaveFeedback error={saveError} saved={saved} />
            {loggingType ? <p role="status" className="text-sm text-muted-foreground">Saving routine...</p> : isLoading && hasLoaded ? <p role="status" className="text-sm text-muted-foreground">Refreshing routines...</p> : null}
            {(hasLoaded || !error) && (
                <div className="space-y-2">
                    {/* Toys */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🧸</span>
                                <div>
                                    <p className="font-medium text-foreground">Fill Toys</p>
                                    <p className="text-xs text-muted-foreground">Morning treats</p>
                                </div>
                            </div>

                            {isLoading && !hasLoaded ? (
                                <span className="text-sm text-muted-foreground">Checking...</span>
                            ) : isToysFilled ? (
                                <div className="flex items-center gap-2 text-green-500">
                                    <Check className="w-5 h-5" />
                                    <span className="text-sm font-medium">{toysFilledBy}</span>
                                </div>
                            ) : isReadOnly ? (
                                <span className="text-sm text-muted-foreground">Not done yet</span>
                            ) : showToysAssignee ? (
                                <div className="flex flex-wrap gap-2">
                                    {USERS.map(u => (
                                        <Button
                                            key={u}
                                            aria-label={u}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleLog('toys', u)}
                                            disabled={Boolean(loggingType) || isLoading || Boolean(error)}
                                            className="min-h-11 min-w-11 px-3 text-sm"
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
                                    disabled={isLoading || Boolean(error)}
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
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

                            {isLoading && !hasLoaded ? (
                                <span className="text-sm text-muted-foreground">Checking...</span>
                            ) : isDinnerDone ? (
                                <div className="flex items-center gap-2 text-green-500">
                                    <Check className="w-5 h-5" />
                                    <span className="text-sm font-medium">{dinnerDoneBy}</span>
                                </div>
                            ) : isReadOnly ? (
                                <span className="text-sm text-muted-foreground">Not done yet</span>
                            ) : showDinnerAssignee ? (
                                <div className="flex flex-wrap gap-2">
                                    {USERS.map(u => (
                                        <Button
                                            key={u}
                                            aria-label={u}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleLog('dinner', u)}
                                            disabled={Boolean(loggingType) || isLoading || Boolean(error)}
                                            className="min-h-11 min-w-11 px-3 text-sm"
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
                                    disabled={isLoading || Boolean(error)}
                                >
                                    Log
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

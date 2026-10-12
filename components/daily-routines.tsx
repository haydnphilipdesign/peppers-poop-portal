'use client'

import { useRef, useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { useActivities } from '@/hooks/use-activities'
import type { ActivityType, UserName } from '@/lib/database.types'
import { SaveFeedback } from '@/components/save-feedback'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { ROUTINE_CONFIG } from '@/lib/activity-utils'

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
    // Initial markup must match across the server and the family's timezone.
    // Care reads settle only on the client, where the local due time applies.
    const isDinnerTime = hasLoaded && (currentHour > 17 || (currentHour === 17 && currentMinute >= 45))

    return (
        <section className="space-y-3">
            <h2 className="font-sans text-base font-semibold">
                <span aria-hidden="true">🏠</span> Daily Routines
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
                    {(['toys', 'dinner'] as const).map(type => {
                        const config = ROUTINE_CONFIG[type]
                        const complete = type === 'toys' ? isToysFilled : isDinnerDone
                        const assignedTo = type === 'toys' ? toysFilledBy : dinnerDoneBy
                        const choosing = type === 'toys' ? showToysAssignee : showDinnerAssignee
                        const choose = (value: boolean) => type === 'toys' ? setShowToysAssignee(value) : setShowDinnerAssignee(value)
                        const blocked = Boolean(loggingType) || isLoading || Boolean(error)
                        return (
                            <div key={type} className={`rounded-xl border bg-card p-3 ${type === 'dinner' && isDinnerTime && !complete ? 'border-amber-500/50' : 'border-border'}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <span aria-hidden="true" className="text-2xl">{config.icon}</span>
                                        <div>
                                            <p className="font-medium">{config.label}</p>
                                            <p className="text-sm text-muted-foreground">{type === 'dinner' && isDinnerTime && !complete ? 'Due at 5:45 PM' : config.description}</p>
                                        </div>
                                    </div>
                                    {isLoading && !hasLoaded ? <span role="status" className="text-sm text-muted-foreground">Checking...</span> : complete ? (
                                        <span className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Check aria-hidden="true" className="h-5 w-5" />Done by {assignedTo}</span>
                                    ) : <span className="text-sm text-muted-foreground">Not done yet</span>}
                                </div>
                                {!complete && !isReadOnly && (hasLoaded || !isLoading) ? (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="secondary" disabled={blocked || !user} onClick={() => { if (user) void handleLog(type, user) }}>Done by {user}</Button>
                                            <Button variant="outline" aria-expanded={choosing} disabled={blocked} onClick={() => choose(!choosing)}>Someone else</Button>
                                        </div>
                                        {choosing ? <div role="group" aria-label={`Who did ${config.label}?`} className="space-y-2">
                                            <p className="text-sm text-muted-foreground">Who did {config.label}? Choosing a person saves the routine.</p>
                                            <div className="flex flex-wrap gap-2">
                                                {USERS.map(person => <Button key={person} variant="outline" disabled={blocked} onClick={() => void handleLog(type, person)}>Done by {person}</Button>)}
                                                <Button variant="ghost" disabled={Boolean(loggingType)} onClick={() => choose(false)}>Cancel</Button>
                                            </div>
                                        </div> : null}
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

'use client'

import { useState } from 'react'
import { FamilyAvatar } from '@/components/family-avatar'
import { useUser } from '@/lib/user-context'
import { useReadOnly } from '@/lib/read-only-context'
import { FAMILY_ORDER } from '@/lib/family'
import { useActivities } from '@/hooks/use-activities'
import type { ActivityType, UserName } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { CheckCircle2, CircleDashed, Loader2, Sparkles, UtensilsCrossed } from 'lucide-react'

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
            <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Daily routines</p>
                <h2 className="text-xl font-semibold text-foreground">Household check-ins</h2>
            </div>

            <div className="space-y-3">
                <RoutineCard
                    icon={<Sparkles className="h-5 w-5" />}
                    iconClassName="bg-amber-100 text-amber-900"
                    title="Fill toys"
                    description="Morning treats and puzzle toys"
                    status={isLoading ? 'Checking...' : isToysFilled ? `Done by ${toysFilledBy}` : 'Not done yet'}
                    tone={isToysFilled ? 'success' : 'default'}
                    isLoading={isLoading}
                    isReadOnly={isReadOnly}
                    isExpanded={showToysAssignee}
                    onExpand={() => setShowToysAssignee(true)}
                >
                    {showToysAssignee ? (
                        <AssigneePicker
                            activityType="toys"
                            loggingType={loggingType}
                            onPick={(assignedTo) => void handleLog('toys', assignedTo)}
                        />
                    ) : null}
                </RoutineCard>

                <RoutineCard
                    icon={<UtensilsCrossed className="h-5 w-5" />}
                    iconClassName={isDinnerTime && !isDinnerDone ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'}
                    title="Make dinner"
                    description={isDinnerTime && !isDinnerDone ? 'Due now for Pepper' : 'Usually around 5:45 PM'}
                    status={isLoading ? 'Checking...' : isDinnerDone ? `Done by ${dinnerDoneBy}` : 'Not done yet'}
                    tone={isDinnerDone ? 'success' : isDinnerTime && !isDinnerDone ? 'warning' : 'default'}
                    isLoading={isLoading}
                    isReadOnly={isReadOnly}
                    isExpanded={showDinnerAssignee}
                    onExpand={() => setShowDinnerAssignee(true)}
                >
                    {showDinnerAssignee ? (
                        <AssigneePicker
                            activityType="dinner"
                            loggingType={loggingType}
                            onPick={(assignedTo) => void handleLog('dinner', assignedTo)}
                        />
                    ) : null}
                </RoutineCard>
            </div>
        </section>
    )
}

function AssigneePicker({
    activityType,
    loggingType,
    onPick,
}: {
    activityType: ActivityType
    loggingType: ActivityType | null
    onPick: (assignedTo: UserName) => void
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-3">
            {FAMILY_ORDER.map((user) => (
                <button
                    key={user}
                    onClick={() => onPick(user)}
                    disabled={loggingType === activityType}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 text-left transition-colors hover:bg-stone-50 disabled:opacity-70"
                >
                    <FamilyAvatar userName={user} size="sm" />
                    <span className="text-sm font-medium text-foreground">
                        {loggingType === activityType ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            user
                        )}
                    </span>
                </button>
            ))}
        </div>
    )
}

function RoutineCard({
    icon,
    iconClassName,
    title,
    description,
    status,
    tone,
    isLoading,
    isReadOnly,
    isExpanded,
    onExpand,
    children,
}: {
    icon: React.ReactNode
    iconClassName: string
    title: string
    description: string
    status: string
    tone: 'default' | 'warning' | 'success'
    isLoading: boolean
    isReadOnly: boolean
    isExpanded: boolean
    onExpand: () => void
    children: React.ReactNode
}) {
    const toneClassName = {
        default: 'border-border bg-white/80',
        warning: 'border-amber-300 bg-amber-50/75',
        success: 'border-emerald-200 bg-emerald-50/75',
    }[tone]

    return (
        <div className={`rounded-[1.6rem] border p-4 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)] ${toneClassName}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className={`rounded-2xl p-2.5 ${iconClassName}`}>{icon}</div>
                    <div>
                        <p className="text-base font-semibold text-foreground">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm text-stone-700">
                        {tone === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        ) : (
                            <CircleDashed className="h-4 w-4 text-muted-foreground" />
                        )}
                        {status}
                    </div>

                    {!isReadOnly && !isExpanded ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onExpand}
                            disabled={isLoading}
                            className="rounded-full"
                        >
                            Log
                        </Button>
                    ) : null}
                </div>
            </div>

            {!isReadOnly && isExpanded ? <div className="mt-4">{children}</div> : null}
        </div>
    )
}

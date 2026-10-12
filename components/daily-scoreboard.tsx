'use client'

interface DailyScoreboardProps {
    poopCount: number
    peeCount: number
    walksCount: number
    poopGoal?: number
    walksGoal?: number
    isLoading?: boolean
    unavailable?: boolean
}

export function DailyScoreboard({ poopCount, peeCount, walksCount, poopGoal = 3, walksGoal = 5, isLoading = false, unavailable = false }: DailyScoreboardProps) {
    const hasCounts = !isLoading && !unavailable
    const totals = [
        { icon: '🦮', label: 'Walks', value: walksCount, goal: walksGoal },
        { icon: '💩', label: 'Poops', value: poopCount, goal: poopGoal },
        { icon: '💦', label: 'Pees', value: peeCount },
    ]
    return (
        <section aria-label="Today's totals" aria-busy={isLoading} className="space-y-2">
            <h2 className="font-sans text-base font-semibold">Today&apos;s totals</h2>
            {isLoading ? <span role="status" className="sr-only">Loading today&apos;s totals...</span> : null}
            {unavailable ? <span className="sr-only">Today&apos;s totals are unavailable.</span> : null}
            {/* Equal columns keep each count under its label at every text size. */}
            <dl className="grid grid-cols-3 gap-2">
                {totals.map(({ icon, label, value, goal }) => {
                    const reached = hasCounts && goal !== undefined && value >= goal
                    return (
                        <div key={label} className="rounded-xl border border-border/70 bg-muted/40 px-2.5 py-2">
                            <dt className="whitespace-nowrap text-sm text-muted-foreground"><span aria-hidden="true">{icon}</span> {label}</dt>
                            <dd className="text-lg font-semibold tabular-nums">
                                {isLoading ? '…' : unavailable ? '—' : value}
                                {goal !== undefined ? <span className="font-normal text-muted-foreground"> <span aria-hidden="true">/</span><span className="sr-only">of</span> {goal}</span> : null}
                                {reached ? <span className="text-emerald-700 dark:text-emerald-300"> <span aria-hidden="true">✓</span><span className="sr-only">goal reached</span></span> : null}
                            </dd>
                        </div>
                    )
                })}
            </dl>
        </section>
    )
}

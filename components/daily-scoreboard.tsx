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
    const count = (value: number) => isLoading ? '…' : unavailable ? '—' : value
    const hasCounts = !isLoading && !unavailable
    return (
        <section aria-label="Today's totals" aria-busy={isLoading} className="rounded-xl border border-border/70 bg-muted/40 p-3 text-sm">
            <h2 className="mb-2 font-sans text-sm font-semibold text-muted-foreground">Today&apos;s totals</h2>
            {isLoading ? <span role="status" className="sr-only">Loading today&apos;s totals...</span> : null}
            {unavailable ? <span className="sr-only">Today&apos;s totals are unavailable.</span> : null}
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
                <span>🦮 <strong>{count(walksCount)} / {walksGoal}</strong> walks {hasCounts && walksCount >= walksGoal ? <span aria-label="Walk goal reached">✓</span> : null}</span>
                <span>💩 <strong>{count(poopCount)} / {poopGoal}</strong> poops {hasCounts && poopCount >= poopGoal ? <span aria-label="Poop goal reached">✓</span> : null}</span>
                <span>💦 <strong>{count(peeCount)}</strong> pees</span>
            </div>
        </section>
    )
}

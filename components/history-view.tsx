'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FamilyAvatar } from '@/components/family-avatar'
import { getFamilyMemberMeta } from '@/lib/family'
import { useHistory } from '@/hooks/use-history'
import type { Walk } from '@/lib/domain/metrics'
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock3, Droplets, Footprints, TriangleAlert } from 'lucide-react'

export function HistoryView() {
    const {
        dayStats,
        isLoading,
        error,
        goToPreviousDay,
        goToNextDay,
        isToday,
    } = useHistory()

    return (
        <div className="space-y-4">
            <Card className="rounded-[1.6rem] border-border/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousDay}
                            className="rounded-full"
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Previous
                        </Button>

                        <div className="text-center">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">History</p>
                            <p className="mt-1 font-semibold text-foreground">{dayStats?.dateFormatted}</p>
                            {isToday ? (
                                <span className="mt-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                                    Today
                                </span>
                            ) : null}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextDay}
                            disabled={isToday}
                            className="rounded-full"
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {error ? (
                <div className="flex items-start gap-3 rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                </div>
            ) : null}

            {isLoading ? (
                <div className="rounded-[1.6rem] border border-border bg-white/75 px-4 py-8 text-center text-muted-foreground shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                    Loading history...
                </div>
            ) : null}

            {!isLoading && dayStats ? (
                <Card className="rounded-[1.6rem] border-border/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                            <div className="rounded-full bg-amber-100 p-2 text-amber-900">
                                <BarChart3 className="h-4 w-4" />
                            </div>
                            Day summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-3">
                        <SummaryChip
                            icon={<Footprints className="h-4 w-4" />}
                            label="Walks"
                            value={dayStats.walksCount}
                            tone="bg-emerald-50 text-emerald-800"
                        />
                        <SummaryChip
                            icon={<span aria-hidden="true">💩</span>}
                            label="Poops"
                            value={dayStats.poopCount}
                            tone="bg-amber-50 text-amber-800"
                        />
                        <SummaryChip
                            icon={<Droplets className="h-4 w-4" />}
                            label="Pees"
                            value={dayStats.peeCount}
                            tone="bg-sky-50 text-sky-800"
                        />
                    </CardContent>
                </Card>
            ) : null}

            {!isLoading && dayStats ? (
                <Card className="rounded-[1.6rem] border-border/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                            <div className="rounded-full bg-amber-100 p-2 text-amber-900">
                                <CalendarDays className="h-4 w-4" />
                            </div>
                            Walk log
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dayStats.walks.length === 0 ? (
                            <div className="rounded-[1.4rem] border border-dashed border-amber-200 bg-amber-50/55 px-4 py-6 text-center">
                                <p className="font-medium text-stone-900">No walks recorded for this day</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Try a different date to compare the family&apos;s routine.
                                </p>
                            </div>
                        ) : (
                            dayStats.walks.map((walk: Walk) => {
                                const member = getFamilyMemberMeta(walk.userName)

                                return (
                                    <div key={walk.id} className={`rounded-[1.4rem] border p-4 ${member.surfaceClassName}`}>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                                                        {walk.timeFormatted}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <FamilyAvatar userName={walk.userName} />
                                                    <span className="font-medium text-foreground">{walk.userName}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {walk.hasPoop ? <HistoryOutcome label="Poop" emoji="💩" /> : null}
                                                {walk.hasPee ? <HistoryOutcome label="Pee" emoji="💦" /> : null}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </CardContent>
                </Card>
            ) : null}
        </div>
    )
}

function SummaryChip({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode
    label: string
    value: number
    tone: string
}) {
    return (
        <div className={`rounded-[1.3rem] px-4 py-3 ${tone}`}>
            <div className="flex items-center gap-2 text-sm font-medium">
                {icon}
                {label}
            </div>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    )
}

function HistoryOutcome({ label, emoji }: { label: string; emoji: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-stone-700">
            <span aria-hidden="true">{emoji}</span>
            {label}
        </span>
    )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FamilyAvatar } from '@/components/family-avatar'
import { useAnalytics } from '@/hooks/use-history'
import type { UserName } from '@/lib/database.types'
import { BarChart3, Clock3, Footprints, TrendingUp, Trophy, TriangleAlert } from 'lucide-react'

const userColors: Record<UserName, string> = {
    Chris: 'bg-sky-500',
    Debbie: 'bg-rose-500',
    Haydn: 'bg-emerald-500',
}

export function Analytics() {
    const { analytics, isLoading, error } = useAnalytics()

    if (isLoading) {
        return (
            <div className="rounded-[1.6rem] border border-border bg-white/75 px-4 py-8 text-center text-muted-foreground shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                Loading analytics...
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-start gap-3 rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
            </div>
        )
    }

    if (!analytics) return null

    const maxPoops = Math.max(...analytics.last7Days.map((day) => day.poopCount), 1)
    const totalTimeOfDay =
        Object.values(analytics.timeOfDayDistribution).reduce((a, b) => a + b, 0) || 1

    const walkers = Object.entries(analytics.walkerStats) as [UserName, { walks: number; poops: number; pees: number }][]
    const topWalker = walkers.reduce(
        (top, [name, stats]) =>
            stats.walks > (top.stats?.walks || 0) ? { name, stats } : top,
        { name: 'Chris' as UserName, stats: analytics.walkerStats.Chris }
    )

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <AnalyticsStatCard
                    title="Best streak"
                    value={analytics.bestStreak}
                    suffix="days"
                    icon={<TrendingUp className="h-5 w-5" />}
                    tone="bg-amber-50 text-amber-900"
                />
                <AnalyticsStatCard
                    title="Average walks"
                    value={analytics.averageWalksPerDay.toFixed(1)}
                    suffix="/ day"
                    icon={<Footprints className="h-5 w-5" />}
                    tone="bg-emerald-50 text-emerald-900"
                />
                <AnalyticsStatCard
                    title="Average poops"
                    value={analytics.averagePoopsPerDay.toFixed(1)}
                    suffix="/ day"
                    icon={<span aria-hidden="true">💩</span>}
                    tone="bg-amber-50 text-amber-900"
                />
            </div>

            <Card className="rounded-[1.6rem] border-border/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-900">
                            <BarChart3 className="h-4 w-4" />
                        </div>
                        Last 7 days
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-40 items-end justify-between gap-2">
                        {analytics.last7Days.map((day, index) => {
                            const height = (day.poopCount / maxPoops) * 100
                            const isToday = index === analytics.last7Days.length - 1

                            return (
                                <div key={day.dateFormatted} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="flex h-28 w-full flex-col items-center justify-end">
                                        {day.poopCount > 0 ? (
                                            <span className="mb-1 text-xs font-medium text-muted-foreground">
                                                {day.poopCount}
                                            </span>
                                        ) : null}
                                        <div
                                            className={`w-full max-w-[42px] rounded-t-2xl transition-all ${
                                                day.poopCount >= 3
                                                    ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                                                    : day.poopCount > 0
                                                        ? 'bg-gradient-to-t from-amber-500 to-orange-400'
                                                        : 'bg-stone-200'
                                            } ${isToday ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-background' : ''}`}
                                            style={{ height: `${Math.max(height, 6)}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs ${isToday ? 'font-semibold text-amber-900' : 'text-muted-foreground'}`}>
                                        {day.dateFormatted}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <LegendSwatch colorClassName="bg-emerald-500" label="Goal met" />
                        <LegendSwatch colorClassName="bg-amber-500" label="Some poops" />
                        <LegendSwatch colorClassName="bg-stone-200" label="None" />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] border-border/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-900">
                            <Trophy className="h-4 w-4" />
                        </div>
                        Walker stats
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {walkers
                        .sort((a, b) => b[1].walks - a[1].walks)
                        .map(([name, stats], index) => {
                            const maxWalks = Math.max(...walkers.map((walker) => walker[1].walks), 1)
                            const width = Math.max((stats.walks / maxWalks) * 100, stats.walks > 0 ? 12 : 0)

                            return (
                                <div key={name} className="rounded-[1.4rem] border border-border/70 bg-stone-50/80 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
                                                {index + 1}
                                            </div>
                                            <FamilyAvatar userName={name} />
                                            <span className="font-medium text-foreground">{name}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span className="rounded-full bg-white px-2.5 py-1">Walks {stats.walks}</span>
                                            <span className="rounded-full bg-white px-2.5 py-1">Poops {stats.poops}</span>
                                            <span className="rounded-full bg-white px-2.5 py-1">Pees {stats.pees}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                                        <div
                                            className={`h-full rounded-full ${userColors[name]} transition-[width] duration-500`}
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] border-border/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-900">
                            <Clock3 className="h-4 w-4" />
                        </div>
                        Walk times
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                    <TimeOfDayCard
                        label="Morning"
                        timeRange="5am - 12pm"
                        percentage={Math.round((analytics.timeOfDayDistribution.morning / totalTimeOfDay) * 100)}
                    />
                    <TimeOfDayCard
                        label="Afternoon"
                        timeRange="12pm - 5pm"
                        percentage={Math.round((analytics.timeOfDayDistribution.afternoon / totalTimeOfDay) * 100)}
                    />
                    <TimeOfDayCard
                        label="Evening"
                        timeRange="5pm - 9pm"
                        percentage={Math.round((analytics.timeOfDayDistribution.evening / totalTimeOfDay) * 100)}
                    />
                    <TimeOfDayCard
                        label="Night"
                        timeRange="9pm - 5am"
                        percentage={Math.round((analytics.timeOfDayDistribution.night / totalTimeOfDay) * 100)}
                    />
                </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] border-amber-200/80 bg-[linear-gradient(145deg,hsl(38_100%_96%),hsl(12_82%_94%))] shadow-[0_22px_50px_-40px_rgba(110,57,18,0.42)]">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-white/80 p-2 text-amber-900 shadow-sm">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Top walker this month</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <FamilyAvatar userName={topWalker.name} />
                                    <p className="text-lg font-semibold text-foreground">{topWalker.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-3xl font-semibold text-amber-900">{topWalker.stats.walks}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Walks</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function AnalyticsStatCard({
    title,
    value,
    suffix,
    icon,
    tone,
}: {
    title: string
    value: string | number
    suffix: string
    icon: React.ReactNode
    tone: string
}) {
    return (
        <div className={`rounded-[1.5rem] px-4 py-4 shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)] ${tone}`}>
            <div className="inline-flex rounded-full bg-white/70 p-2 shadow-sm">{icon}</div>
            <p className="mt-3 text-sm font-medium">{title}</p>
            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">{value}</span>
                <span className="text-sm opacity-80">{suffix}</span>
            </div>
        </div>
    )
}

function LegendSwatch({
    colorClassName,
    label,
}: {
    colorClassName: string
    label: string
}) {
    return (
        <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${colorClassName}`} />
            <span>{label}</span>
        </div>
    )
}

function TimeOfDayCard({
    label,
    timeRange,
    percentage,
}: {
    label: string
    timeRange: string
    percentage: number
}) {
    return (
        <div className="rounded-[1.4rem] border border-border/70 bg-stone-50/80 p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{percentage}%</p>
            <p className="mt-1 font-medium text-foreground">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timeRange}</p>
        </div>
    )
}

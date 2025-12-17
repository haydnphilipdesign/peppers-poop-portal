'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalytics } from '@/hooks/use-history'
import type { UserName } from '@/lib/database.types'

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

const userColors: Record<UserName, string> = {
    Chris: 'bg-blue-500',
    Debbie: 'bg-pink-500',
    Haydn: 'bg-emerald-500',
}

export function Analytics() {
    const { analytics, isLoading, error } = useAnalytics()

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin text-4xl mb-2">📊</div>
                <p className="text-muted-foreground">Loading analytics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                ⚠️ {error}
            </div>
        )
    }

    if (!analytics) return null

    const maxPoops = Math.max(...analytics.last7Days.map(d => d.poopCount), 1)
    const totalTimeOfDay = Object.values(analytics.timeOfDayDistribution).reduce((a, b) => a + b, 0) || 1

    // Find top walker
    const walkers = Object.entries(analytics.walkerStats) as [UserName, { walks: number; poops: number; pees: number }][]
    const topWalker = walkers.reduce((top, [name, stats]) =>
        stats.walks > (top.stats?.walks || 0) ? { name, stats } : top,
        { name: 'Chris' as UserName, stats: analytics.walkerStats.Chris }
    )

    return (
        <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-1">🔥</div>
                        <div className="text-2xl font-bold text-amber-400">{analytics.bestStreak}</div>
                        <div className="text-xs text-muted-foreground">Best Streak</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-1">🦮</div>
                        <div className="text-2xl font-bold text-green-400">{analytics.averageWalksPerDay.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Walks/Day</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-1">💩</div>
                        <div className="text-2xl font-bold text-purple-400">{analytics.averagePoopsPerDay.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Poops/Day</div>
                    </CardContent>
                </Card>
            </div>

            {/* 7-Day Poop Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        📈 Last 7 Days
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between gap-1 h-32">
                        {analytics.last7Days.map((day, index) => {
                            const height = (day.poopCount / maxPoops) * 100
                            const isToday = index === analytics.last7Days.length - 1

                            return (
                                <div key={day.dateFormatted} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex flex-col items-center justify-end h-24">
                                        {day.poopCount > 0 && (
                                            <span className="text-xs font-medium text-muted-foreground mb-1">
                                                {day.poopCount}
                                            </span>
                                        )}
                                        <div
                                            className={`w-full max-w-[40px] rounded-t-md transition-all ${day.poopCount >= 3
                                                ? 'bg-gradient-to-t from-green-500 to-green-400'
                                                : day.poopCount > 0
                                                    ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                                                    : 'bg-muted'
                                                } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                                        {day.dateFormatted}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span>Goal met (3+)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span>Some poops</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Walker Leaderboard */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        🏆 Walker Stats (30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {walkers
                        .sort((a, b) => b[1].walks - a[1].walks)
                        .map(([name, stats], index) => {
                            const maxWalks = Math.max(...walkers.map(w => w[1].walks), 1)
                            const width = (stats.walks / maxWalks) * 100

                            return (
                                <div key={name} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {index === 0 && <span className="text-lg">👑</span>}
                                            <span className="text-xl">{userEmojis[name]}</span>
                                            <span className="font-medium">{name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span>🦮 {stats.walks}</span>
                                            <span>💩 {stats.poops}</span>
                                            <span>💦 {stats.pees}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${userColors[name]} rounded-full transition-all`}
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                </CardContent>
            </Card>

            {/* Time of Day Distribution */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        🌅 Walk Times (30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-3 rounded-lg bg-gradient-to-b from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                            <div className="text-2xl mb-1">🌅</div>
                            <div className="text-lg font-bold text-orange-400">
                                {Math.round((analytics.timeOfDayDistribution.morning / totalTimeOfDay) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Morning</div>
                            <div className="text-xs text-muted-foreground/60">5am-12pm</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gradient-to-b from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                            <div className="text-2xl mb-1">☀️</div>
                            <div className="text-lg font-bold text-yellow-400">
                                {Math.round((analytics.timeOfDayDistribution.afternoon / totalTimeOfDay) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Afternoon</div>
                            <div className="text-xs text-muted-foreground/60">12pm-5pm</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gradient-to-b from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                            <div className="text-2xl mb-1">🌆</div>
                            <div className="text-lg font-bold text-purple-400">
                                {Math.round((analytics.timeOfDayDistribution.evening / totalTimeOfDay) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Evening</div>
                            <div className="text-xs text-muted-foreground/60">5pm-9pm</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gradient-to-b from-indigo-500/10 to-slate-500/10 border border-indigo-500/20">
                            <div className="text-2xl mb-1">🌙</div>
                            <div className="text-lg font-bold text-indigo-400">
                                {Math.round((analytics.timeOfDayDistribution.night / totalTimeOfDay) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Night</div>
                            <div className="text-xs text-muted-foreground/60">9pm-5am</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Walker Highlight */}
            <Card className="bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">👑</span>
                            <div>
                                <p className="text-sm text-muted-foreground">Top Walker This Month</p>
                                <p className="text-xl font-bold text-foreground flex items-center gap-2">
                                    {userEmojis[topWalker.name]} {topWalker.name}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-amber-400">{topWalker.stats.walks}</p>
                            <p className="text-xs text-muted-foreground">walks</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

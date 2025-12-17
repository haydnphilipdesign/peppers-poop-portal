'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useHistory, type Walk } from '@/hooks/use-history'
import type { UserName } from '@/lib/database.types'

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

const userColors: Record<UserName, string> = {
    Chris: 'bg-blue-500/10 border-blue-500/20',
    Debbie: 'bg-pink-500/10 border-pink-500/20',
    Haydn: 'bg-emerald-500/10 border-emerald-500/20',
}

export function HistoryView() {
    const {
        selectedDate,
        dayStats,
        isLoading,
        error,
        goToPreviousDay,
        goToNextDay,
        goToToday,
        isToday,
    } = useHistory()

    return (
        <div className="space-y-4">
            {/* Date Navigation */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousDay}
                            className="px-3"
                        >
                            ← Prev
                        </Button>

                        <div className="text-center flex-1">
                            <p className="font-semibold text-foreground">
                                {dayStats?.dateFormatted}
                            </p>
                            {isToday && (
                                <span className="text-xs text-primary font-medium">Today</span>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextDay}
                            disabled={isToday}
                            className="px-3"
                        >
                            Next →
                        </Button>
                    </div>

                    {!isToday && (
                        <div className="mt-3 text-center">
                            <Button variant="ghost" size="sm" onClick={goToToday}>
                                ↩️ Back to Today
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    ⚠️ {error}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin text-4xl mb-2">🐕</div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            )}

            {/* Day Stats Summary */}
            {!isLoading && dayStats && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            📊 Day Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-400">
                                <span>🦮</span>
                                <span className="font-semibold">{dayStats.walksCount}</span>
                                <span className="opacity-60">walks</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <span>💩</span>
                                <span className="font-semibold">{dayStats.poopCount}</span>
                                <span className="opacity-60">poops</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <span>💦</span>
                                <span className="font-semibold">{dayStats.peeCount}</span>
                                <span className="opacity-60">pees</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Walk List */}
            {!isLoading && dayStats && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            🦮 Walk Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dayStats.walks.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                                No walks recorded for this day. 🐕
                            </p>
                        ) : (
                            dayStats.walks.map((walk: Walk) => (
                                <div
                                    key={walk.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border ${userColors[walk.userName]} transition-all`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono font-medium text-muted-foreground min-w-[70px]">
                                            {walk.timeFormatted}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xl">{userEmojis[walk.userName]}</span>
                                            <span className="text-sm font-medium text-foreground">
                                                {walk.userName}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-2xl">
                                        {walk.hasPoop && <span title="Poop">💩</span>}
                                        {walk.hasPee && <span title="Pee">💦</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

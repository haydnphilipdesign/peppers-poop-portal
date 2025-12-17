'use client'

import { Card, CardContent } from '@/components/ui/card'

interface DailyScoreboardProps {
    poopCount: number
    peeCount: number
    walksCount: number
    poopGoal?: number
    walksGoal?: number
}

export function DailyScoreboard({
    poopCount,
    peeCount,
    walksCount,
    poopGoal = 3,
    walksGoal = 5
}: DailyScoreboardProps) {
    const poopGoalReached = poopCount >= poopGoal
    const poopProgressPercentage = Math.min((poopCount / poopGoal) * 100, 100)
    const walksProgressPercentage = Math.min((walksCount / walksGoal) * 100, 100)
    const allWalksDone = walksCount >= walksGoal

    return (
        <div className="space-y-4">
            {/* Walks Banner - Full Width */}
            <Card className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-200 dark:border-green-800 shadow-lg overflow-hidden">
                <CardContent className="p-4 relative">
                    {/* Progress bar background */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-green-300/50 to-emerald-300/50 dark:from-green-700/30 dark:to-emerald-700/30 transition-all duration-500 ease-out"
                        style={{ width: `${walksProgressPercentage}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">🦮</span>
                            <div>
                                <span className="text-sm font-medium text-green-800 dark:text-green-200 uppercase tracking-wide">
                                    Today&apos;s Walks
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-4xl font-bold ${allWalksDone ? 'text-green-600 dark:text-green-400' : 'text-green-900 dark:text-green-100'}`}>
                                        {walksCount}
                                    </span>
                                    <span className="text-xl text-green-700 dark:text-green-300">
                                        / {walksGoal}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {allWalksDone && (
                            <div className="text-3xl animate-bounce">🎉</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Poop and Pee Cards */}
            <div className="grid grid-cols-2 gap-4">
                {/* Poop Card */}
                <Card className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
                    <CardContent className="p-4 relative">
                        {/* Progress bar background */}
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-amber-300/50 to-orange-300/50 dark:from-amber-700/30 dark:to-orange-700/30 transition-all duration-500 ease-out"
                            style={{ width: `${poopProgressPercentage}%` }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-3xl">💩</span>
                                <span className="text-sm font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                                    Poops
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-4xl font-bold ${poopGoalReached ? 'text-green-600 dark:text-green-400' : 'text-amber-900 dark:text-amber-100'}`}>
                                    {poopCount}
                                </span>
                                <span className="text-xl text-amber-700 dark:text-amber-300">
                                    / {poopGoal}
                                </span>
                            </div>
                            {poopGoalReached && (
                                <div className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                                    ✅ Goal reached!
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pee Card */}
                <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 border-blue-200 dark:border-blue-800 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-3xl">💦</span>
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                                Pees
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                                {peeCount}
                            </span>
                            <span className="text-xl text-blue-700 dark:text-blue-300">
                                today
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

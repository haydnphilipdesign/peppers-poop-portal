'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'

interface WalkHistoryProps {
    walks: Walk[]
}

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

const userColors: Record<UserName, string> = {
    Chris: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    Debbie: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800',
    Haydn: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
}

export function WalkHistory({ walks }: WalkHistoryProps) {
    if (walks.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/40 dark:to-stone-800/40 border-stone-200 dark:border-stone-700 shadow-lg">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
                        🦮 Today&apos;s Walk Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-stone-500 dark:text-stone-400 text-center py-4">
                        No walks yet today. Time to take Pepper out! 🐕
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/40 dark:to-stone-800/40 border-stone-200 dark:border-stone-700 shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
                    🦮 Today&apos;s Walk Log
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {walks.map((walk) => (
                    <div
                        key={walk.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${userColors[walk.userName]} transition-all hover:scale-[1.01]`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Time */}
                            <span className="text-sm font-mono font-medium text-stone-600 dark:text-stone-300 min-w-[70px]">
                                {walk.timeFormatted}
                            </span>

                            {/* User */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl">{userEmojis[walk.userName]}</span>
                                <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                                    {walk.userName}
                                </span>
                            </div>
                        </div>

                        {/* What Pepper did */}
                        <div className="flex items-center gap-1 text-2xl">
                            {walk.hasPoop && <span title="Poop">💩</span>}
                            {walk.hasPee && <span title="Pee">💦</span>}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserName } from '@/lib/database.types'

interface LeaderboardProps {
    weeklyPoints: Record<UserName, number>
}

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

const medals = ['🥇', '🥈', '🥉']

export function Leaderboard({ weeklyPoints }: LeaderboardProps) {
    const sortedUsers = (Object.entries(weeklyPoints) as [UserName, number][])
        .sort((a, b) => b[1] - a[1])

    return (
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-800 shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                    🏆 Weekly Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {sortedUsers.map(([name, points], index) => (
                    <div
                        key={name}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${index === 0
                                ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 shadow-md'
                                : 'bg-white/50 dark:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{medals[index] || '🎖️'}</span>
                            <span className="text-xl">{userEmojis[name]}</span>
                            <span className="font-medium text-stone-800 dark:text-stone-200">
                                {name}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                                {points}
                            </span>
                            <span className="text-sm text-purple-600 dark:text-purple-400 ml-1">
                                pts
                            </span>
                        </div>
                    </div>
                ))}
                <p className="text-xs text-center text-purple-600 dark:text-purple-400 pt-2">
                    💩 = 10 pts · 💦 = 5 pts
                </p>
            </CardContent>
        </Card>
    )
}

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
        <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    🏆 Weekly Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {sortedUsers.map(([name, points], index) => (
                    <div
                        key={name}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${index === 0
                            ? 'bg-yellow-500/20 border border-yellow-500/30 shadow-md'
                            : 'bg-muted/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{medals[index] || '🎖️'}</span>
                            <span className="text-xl">{userEmojis[name]}</span>
                            <span className="font-medium text-foreground">
                                {name}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-bold text-purple-400">
                                {points}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">
                                pts
                            </span>
                        </div>
                    </div>
                ))}
                <p className="text-xs text-center text-muted-foreground pt-2">
                    💩 5 · 💦 5 · 🧸 5 · 🍽️ 5 · 💊 10 pts
                </p>
            </CardContent>
        </Card>
    )
}

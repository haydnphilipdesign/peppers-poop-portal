'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserName } from '@/lib/database.types'
import type { MonthlyChampion } from '@/lib/domain/metrics'
import { format } from 'date-fns'

interface LeaderboardProps {
    monthlyPoints: Record<UserName, number>
    champion?: MonthlyChampion | null
    championMonth?: string
}

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

const medals = ['🥇', '🥈', '🥉']

export function Leaderboard({ monthlyPoints, champion, championMonth }: LeaderboardProps) {
    const sortedUsers = (Object.entries(monthlyPoints) as [UserName, number][])
        .sort((a, b) => b[1] - a[1])
    const currentMonth = format(new Date(), 'LLLL')

    const championWinners = champion?.winners ?? []
    const championNames = championWinners.join(' & ')

    return (
        <Card className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border-amber-500/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    🏆 {currentMonth} Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {champion && championNames ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/15 px-3 py-2">
                        <span className="text-2xl">👑</span>
                        <p className="text-sm font-medium text-foreground">
                            <span className="font-semibold">{championNames}</span>{' '}
                            {championWinners.length > 1 ? 'shared the' : 'won the'}{' '}
                            {championMonth} crown
                        </p>
                    </div>
                ) : null}

                {sortedUsers.map(([name, points], index) => {
                    const isChampion = championWinners.includes(name)
                    return (
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
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                    {name}
                                    {isChampion ? (
                                        <span title={`${championMonth} champion`} aria-label={`${championMonth} champion`}>
                                            👑
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                                    {points}
                                </span>
                                <span className="text-sm text-muted-foreground ml-1">
                                    pts
                                </span>
                            </div>
                        </div>
                    )
                })}
                <p className="text-xs text-center text-muted-foreground pt-2">
                    🦮 Walks +5 · 🧸 Activities +5 · 🗓️ Grooming +5 · ✅ Reminders +5
                </p>
            </CardContent>
        </Card>
    )
}

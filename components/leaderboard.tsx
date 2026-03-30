'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FamilyAvatar } from '@/components/family-avatar'
import { format } from 'date-fns'
import { Activity, CalendarDays, Footprints, Trophy } from 'lucide-react'
import type { UserName } from '@/lib/database.types'

interface LeaderboardProps {
    monthlyPoints: Record<UserName, number>
}

export function Leaderboard({ monthlyPoints }: LeaderboardProps) {
    const sortedUsers = (Object.entries(monthlyPoints) as [UserName, number][])
        .sort((a, b) => b[1] - a[1])
    const currentMonth = format(new Date(), 'LLLL')
    const highestPoints = Math.max(...sortedUsers.map(([, points]) => points), 1)

    return (
        <Card className="rounded-[1.8rem] border-amber-200/80 bg-[linear-gradient(145deg,hsl(32_100%_96%),hsl(12_82%_94%))] shadow-[0_22px_50px_-40px_rgba(110,57,18,0.42)]">
            <CardHeader className="pb-3">
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-900/70">Monthly leaderboard</p>
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                        <div className="rounded-full bg-white/75 p-2 text-amber-900 shadow-sm">
                            <Trophy className="h-4 w-4" />
                        </div>
                        {currentMonth} points
                    </CardTitle>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {sortedUsers.map(([name, points], index) => {
                    const fillWidth = Math.max((points / highestPoints) * 100, points > 0 ? 12 : 0)

                    return (
                        <div key={name} className="rounded-[1.4rem] border border-white/80 bg-white/65 p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
                                        {index + 1}
                                    </div>
                                    <FamilyAvatar userName={name} />
                                    <div>
                                        <p className="font-semibold text-foreground">{name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {index === 0 ? 'Currently in the lead' : 'Still in the running'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-2xl font-semibold text-amber-900">{points}</p>
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pts</p>
                                </div>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100/70">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-500"
                                    style={{ width: `${fillWidth}%` }}
                                />
                            </div>
                        </div>
                    )
                })}

                <div className="grid gap-2 rounded-[1.4rem] border border-white/70 bg-white/50 p-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                        <Footprints className="h-4 w-4 text-amber-900" />
                        Walks: 5 pts
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-amber-900" />
                        Activities: 5 pts
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-amber-900" />
                        Grooming scheduled: 5 pts
                    </div>
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-900" />
                        Reminders completed: 5 pts
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow, format } from 'date-fns'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'
import { Clock } from 'lucide-react'

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

interface LastWalkCardProps {
    walk: Walk | null
}

export function LastWalkCard({ walk }: LastWalkCardProps) {
    if (!walk) return null

    // Calculate time stuff
    const timeAgo = formatDistanceToNow(walk.time, { addSuffix: true })
    const exactTime = format(walk.time, 'h:mm a')
    const date = format(walk.time, 'MMM d')
    const isToday = new Date().toDateString() === walk.time.toDateString()

    return (
        <Card className="overflow-hidden border-amber-800/20 bg-gradient-to-br from-amber-50 to-rose-50 shadow-sm">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-amber-900/70">
                            <Clock className="w-4 h-4" />
                            Latest Walk
                        </div>

                        <p className="text-3xl font-semibold leading-none">{timeAgo}</p>

                        <div className="flex items-center gap-2 text-sm text-amber-950/70">
                            <span>{isToday ? 'Today' : date} at {exactTime}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                {userEmojis[walk.userName]} {walk.userName}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-1.5">
                        {walk.hasPoop && (
                            <div className="rounded-xl border border-amber-600/25 bg-amber-500/10 p-2" title="Poop">
                                <span className="text-xl">💩</span>
                            </div>
                        )}
                        {walk.hasPee && (
                            <div className="rounded-xl border border-sky-600/25 bg-sky-500/10 p-2" title="Pee">
                                <span className="text-xl">💦</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

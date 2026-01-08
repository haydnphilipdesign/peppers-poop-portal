'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow, format } from 'date-fns'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'
import { Clock, Footprints } from 'lucide-react'

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
        <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-5">
                <Footprints className="w-24 h-24 -rotate-12" />
            </div>

            <CardContent className="p-4 relative">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium uppercase tracking-wide">
                            <Clock className="w-4 h-4" />
                            Latest Activity
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight">
                                {timeAgo}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{isToday ? 'Today' : date} at {exactTime}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                {userEmojis[walk.userName]} {walk.userName}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-1.5">
                            {walk.hasPoop && (
                                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl" title="Poop">
                                    <span className="text-xl">💩</span>
                                </div>
                            )}
                            {walk.hasPee && (
                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl" title="Pee">
                                    <span className="text-xl">💦</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

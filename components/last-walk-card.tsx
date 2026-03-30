'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FamilyAvatar } from '@/components/family-avatar'
import { formatDistanceToNow, format } from 'date-fns'
import type { Walk } from '@/hooks/use-logs'
import { Clock3, Footprints } from 'lucide-react'

interface LastWalkCardProps {
    walk: Walk | null
}

function WalkOutcome({ label, emoji }: { label: string; emoji: string }) {
    return (
        <div className="rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm">
            <span aria-hidden="true" className="mr-1.5">
                {emoji}
            </span>
            {label}
        </div>
    )
}

export function LastWalkCard({ walk }: LastWalkCardProps) {
    if (!walk) return null

    const timeAgo = formatDistanceToNow(walk.time, { addSuffix: true })
    const exactTime = format(walk.time, 'h:mm a')
    const date = format(walk.time, 'MMM d')
    const isToday = new Date().toDateString() === walk.time.toDateString()

    return (
        <Card className="rounded-[1.8rem] border-amber-200/80 bg-[linear-gradient(145deg,hsl(38_100%_96%),hsl(10_90%_95%))] shadow-[0_26px_60px_-46px_rgba(133,78,14,0.55)]">
            <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-amber-900/70">
                            <div className="rounded-full bg-white/75 p-2 text-amber-900 shadow-sm">
                                <Clock3 className="h-4 w-4" />
                            </div>
                            Latest walk
                        </div>

                        <div>
                            <p className="text-3xl font-semibold leading-none text-stone-950">{timeAgo}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-950/80">
                                <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">
                                    {isToday ? 'Today' : date} at {exactTime}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm">
                                    <FamilyAvatar userName={walk.userName} size="sm" />
                                    {walk.userName}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:max-w-[220px] sm:justify-end">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm">
                            <Footprints className="h-4 w-4 text-amber-900" />
                            Logged
                        </div>
                        {walk.hasPoop ? <WalkOutcome label="Poop" emoji="💩" /> : null}
                        {walk.hasPee ? <WalkOutcome label="Pee" emoji="💦" /> : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

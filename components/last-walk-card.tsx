'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { formatDistance, format } from 'date-fns'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

interface LastWalkCardProps {
    walk: Walk | null
    isLoading?: boolean
    error?: string | null
    isRefreshing?: boolean
    onRetry?: () => void
}

export function LastWalkCard({ walk, isLoading = false, error, isRefreshing = false, onRetry }: LastWalkCardProps) {
    const [, setTick] = useState(0)
    useEffect(() => {
        const timer = window.setInterval(() => setTick(tick => tick + 1), 60_000)
        return () => window.clearInterval(timer)
    }, [])
    // Parent refreshes at midnight/foreground must update the day label immediately.
    const now = new Date()
    const timeAgo = walk ? formatDistance(walk.time, now, { addSuffix: true }) : null
    const exactTime = walk ? format(walk.time, 'h:mm a') : null
    const date = walk ? format(walk.time, 'MMM d') : null
    const isToday = walk && now.toDateString() === walk.time.toDateString()

    // Gentle nudge: how long since Pepper was last taken out?
    const isDue = walk && now.getTime() - walk.time.getTime() >= 5 * 60 * 60 * 1000

    return (
        <Card aria-busy={isLoading || isRefreshing} className="border-amber-800/20 bg-gradient-to-br from-amber-50 to-rose-50 py-0 shadow-sm dark:border-amber-300/10 dark:from-amber-950/30 dark:to-rose-950/20">
            <CardContent className="space-y-1 p-3">
                <div className="flex flex-wrap min-h-7 items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-sans text-sm font-semibold text-amber-900 dark:text-amber-200">
                        <Clock aria-hidden="true" className="h-4 w-4" /> Latest Walk
                    </h2>
                    <p className="flex flex-wrap items-center gap-x-3 text-sm">
                        {walk?.hasPoop ? <span><span aria-hidden="true">💩</span> Poop</span> : null}
                        {walk?.hasPee ? <span><span aria-hidden="true">💦</span> Pee</span> : null}
                        {walk && !walk.hasPoop && !walk.hasPee ? <span>Neither</span> : null}
                    </p>
                </div>
                {isLoading ? (
                    <div role="status" className="space-y-2">
                        <span className="sr-only">Loading latest walk...</span>
                        <div aria-hidden="true" className="h-8 w-3/4 rounded-md bg-amber-900/10 motion-safe:animate-pulse" />
                        <div aria-hidden="true" className="h-5 w-2/3 rounded-md bg-amber-900/10 motion-safe:animate-pulse" />
                    </div>
                ) : (
                    <>
                        <p className={`text-2xl font-semibold leading-8 ${isDue ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                            {timeAgo ?? (error ? 'Walk data unavailable' : 'No recent walks')}
                        </p>
                        <p className="min-h-5 text-sm text-amber-950/80 dark:text-amber-100/80">
                            {walk ? `${isToday ? 'Today' : date} at ${exactTime} · ${userEmojis[walk.userName]} ${walk.userName}` : error ? 'Please try loading the dashboard again.' : 'No walks logged in the last 30 days.'}
                        </p>
                    </>
                )}
                {/* One reserved line keeps the cards below still when a nudge appears. */}
                <div className="flex min-h-5 items-center justify-between gap-2">
                    <p role={error ? 'alert' : 'status'} className="text-sm text-amber-900 dark:text-amber-200">
                        {error ? (error.startsWith('Change saved') ? error : walk ? 'Could not refresh. Showing previously loaded data.' : 'Could not load care data.') : isRefreshing ? 'Updating care data...' : isDue ? '🐾 Pepper may be due for a walk.' : ''}
                    </p>
                    {error && onRetry ? <Button variant="outline" onClick={onRetry} disabled={isLoading || isRefreshing}>Retry</Button> : null}
                </div>
            </CardContent>
        </Card>
    )
}

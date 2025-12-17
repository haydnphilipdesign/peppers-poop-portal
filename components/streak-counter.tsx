'use client'

import { Card, CardContent } from '@/components/ui/card'

interface StreakCounterProps {
    streak: number
}

export function StreakCounter({ streak }: StreakCounterProps) {
    const getStreakMessage = () => {
        if (streak === 0) return "Start a streak today!"
        if (streak === 1) return "Great start! 🌟"
        if (streak < 5) return "Keep it going! 💪"
        if (streak < 10) return "On fire! 🔥"
        return "Legendary! 🏆"
    }

    return (
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="text-5xl animate-pulse">
                    {streak > 0 ? '🔥' : '❄️'}
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-orange-400">
                            {streak}
                        </span>
                        <span className="text-lg text-muted-foreground">
                            day{streak !== 1 ? 's' : ''} streak
                        </span>
                    </div>
                    <p className="text-sm text-orange-300/80 mt-1">
                        {getStreakMessage()}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

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
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-200 dark:border-red-800 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="text-5xl animate-pulse">
                    {streak > 0 ? '🔥' : '❄️'}
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-red-600 dark:text-red-400">
                            {streak}
                        </span>
                        <span className="text-lg text-red-700 dark:text-red-300">
                            day{streak !== 1 ? 's' : ''} streak
                        </span>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getStreakMessage()}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

'use client'

import { useUser } from '@/lib/user-context'
import { useLogs } from '@/hooks/use-logs'
import { DailyScoreboard } from './daily-scoreboard'
import { LogButtons } from './log-buttons'
import { StreakCounter } from './streak-counter'
import { Leaderboard } from './leaderboard'
import { Button } from '@/components/ui/button'

export function Dashboard() {
    const { user, setUser } = useUser()
    const {
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        streak,
        weeklyPoints,
        addLog,
        isLoading,
        error
    } = useLogs()

    if (!user) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-zinc-900 dark:via-stone-900 dark:to-neutral-900">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-stone-900/80 border-b border-amber-200 dark:border-stone-800 shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🐕</span>
                        <div>
                            <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                                Pepper&apos;s Portal
                            </h1>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                Walking as {user}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUser(null)}
                        className="text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400"
                    >
                        Switch User
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Error Message */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-8">
                        <div className="animate-spin text-4xl mb-2">🐕</div>
                        <p className="text-stone-500 dark:text-stone-400">Loading...</p>
                    </div>
                )}

                {/* Daily Scoreboard */}
                <section>
                    <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide mb-3">
                        📊 Daily Scoreboard
                    </h2>
                    <DailyScoreboard
                        poopCount={todayPoopCount}
                        peeCount={todayPeeCount}
                        walksCount={todayWalksCount}
                    />
                </section>

                {/* Quick Log Buttons */}
                <section>
                    <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide mb-3">
                        🚀 Quick Log
                    </h2>
                    <LogButtons
                        userName={user}
                        todayPoopCount={todayPoopCount}
                        onLog={addLog}
                    />
                </section>

                {/* Streak Counter */}
                <section>
                    <StreakCounter streak={streak} />
                </section>

                {/* Leaderboard */}
                <section>
                    <Leaderboard weeklyPoints={weeklyPoints} />
                </section>

                {/* Footer */}
                <footer className="text-center text-xs text-stone-400 dark:text-stone-600 pt-8 pb-4">
                    Pepper&apos;s Poop Portal • Made with 💩 and ❤️
                </footer>
            </main>
        </div>
    )
}

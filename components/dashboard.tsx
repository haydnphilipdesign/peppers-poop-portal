'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useLogs } from '@/hooks/use-logs'
import { WalkHistory } from './walk-history'
import { LogWalkButton } from './log-walk-button'
import { StreakCounter } from './streak-counter'
import { Leaderboard } from './leaderboard'
import { DailyRoutines } from './daily-routines'
import { RemindersBanner } from './reminders-banner'
import { ReminderManager } from './reminder-manager'
import { HistoryView } from './history-view'
import { Analytics } from './analytics'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

type TabValue = 'today' | 'history' | 'analytics'

export function Dashboard() {
    const { user, setUser } = useUser()
    const [activeTab, setActiveTab] = useState<TabValue>('today')
    const {
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        todayWalks,
        streak,
        weeklyPoints,
        addWalk,
        deleteWalk,
        updateWalk,
        isLoading,
        error
    } = useLogs()

    if (!user) return null

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🐕</span>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Pepper&apos;s Portal
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Walking as {user}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUser(null)}
                    >
                        Switch User
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Tab Navigation */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                    <TabsList>
                        <TabsTrigger value="today">🏠 Today</TabsTrigger>
                        <TabsTrigger value="history">📅 History</TabsTrigger>
                        <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
                    </TabsList>

                    {/* Today Tab */}
                    <TabsContent value="today">
                        <div className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Loading State */}
                            {isLoading && (
                                <div className="text-center py-8">
                                    <div className="animate-spin text-4xl mb-2">🐕</div>
                                    <p className="text-muted-foreground">Loading...</p>
                                </div>
                            )}

                            {/* Important Reminders Banner */}
                            <RemindersBanner />

                            {/* Walk History with integrated stats */}
                            <section>
                                <WalkHistory
                                    walks={todayWalks}
                                    poopCount={todayPoopCount}
                                    peeCount={todayPeeCount}
                                    walksCount={todayWalksCount}
                                    onDeleteWalk={deleteWalk}
                                    onUpdateWalk={updateWalk}
                                />
                            </section>

                            {/* Quick Log Button */}
                            <section>
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                    🚀 Quick Log
                                </h2>
                                <LogWalkButton
                                    userName={user}
                                    todayPoopCount={todayPoopCount}
                                    onLogWalk={addWalk}
                                />
                            </section>

                            {/* Daily Routines */}
                            <DailyRoutines />

                            {/* Care Schedule */}
                            <ReminderManager />

                            {/* Streak Counter */}
                            <section>
                                <StreakCounter streak={streak} />
                            </section>

                            {/* Leaderboard */}
                            <section>
                                <Leaderboard weeklyPoints={weeklyPoints} />
                            </section>
                        </div>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history">
                        <HistoryView />
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics">
                        <Analytics />
                    </TabsContent>
                </Tabs>

                <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
                    Pepper&apos;s Portal • Made with 🐕 and ❤️
                </footer>
            </main>
        </div>
    )
}

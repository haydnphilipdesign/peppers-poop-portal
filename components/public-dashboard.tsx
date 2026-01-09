'use client'

import { useState } from 'react'
import { useReadOnly } from '@/lib/read-only-context'
import { useLogs } from '@/hooks/use-logs'
import { WalkHistory } from './walk-history'

import { Leaderboard } from './leaderboard'
import { DailyRoutines } from './daily-routines'
import { RemindersBanner } from './reminders-banner'
import { ReminderManager } from './reminder-manager'
import { HistoryView } from './history-view'
import { Analytics } from './analytics'
import { LastWalkCard } from './last-walk-card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

type TabValue = 'today' | 'history' | 'analytics'

export function PublicDashboard() {
    const isReadOnly = useReadOnly()
    const [activeTab, setActiveTab] = useState<TabValue>('today')
    const {
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        todayWalks,
        latestWalk,

        weeklyPoints,
        isLoading,
        error
    } = useLogs()

    // Dummy functions for read-only mode (won't be called but needed for prop types)
    const noopDelete = async () => { }
    const noopUpdate = async () => { }

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
                                View Only Mode
                            </p>
                        </div>
                    </div>
                    {/* View Only Badge */}
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium">
                        👀 View Only
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Latest Walk Card (Always visible) */}
                {!isLoading && latestWalk && (
                    <LastWalkCard walk={latestWalk} />
                )}

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

                            {/* Walk History with integrated stats (read-only) */}
                            <section>
                                <WalkHistory
                                    walks={todayWalks}
                                    poopCount={todayPoopCount}
                                    peeCount={todayPeeCount}
                                    walksCount={todayWalksCount}
                                    onDeleteWalk={noopDelete}
                                    onUpdateWalk={noopUpdate}
                                />
                            </section>

                            {/* Quick Log Button - HIDDEN in read-only mode */}
                            {/* No LogWalkButton here */}

                            {/* Daily Routines */}
                            <DailyRoutines />

                            {/* Care Schedule */}
                            <ReminderManager />



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
                    <br />
                    <a href="https://www.multimedium.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        multimedium.dev
                    </a>
                </footer>
            </main>
        </div>
    )
}

'use client'

import { useState } from 'react'
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
    const [activeTab, setActiveTab] = useState<TabValue>('today')
    const {
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        todayWalks,
        latestWalk,
        weeklyPoints,
        isLoading,
        error,
    } = useLogs()

    const noopDelete = async () => { }
    const noopUpdate = async () => { }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(32_100%_95%),hsl(var(--background))_36%),radial-gradient(circle_at_20%_120%,hsl(18_85%_94%),transparent_42%)] text-foreground">
            <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
                <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
                    <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                            Pepper&apos;s Portal
                        </p>
                        <h1 className="font-serif text-xl font-semibold leading-tight">
                            Live Read-Only Dashboard
                        </h1>
                    </div>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700">
                        View Only
                    </span>
                </div>
            </header>

            <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
                {!isLoading && latestWalk ? <LastWalkCard walk={latestWalk} /> : null}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                    <TabsList className="h-11 rounded-xl border border-border/80 bg-card p-1">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="today" className="mt-5">
                        <div className="space-y-5">
                            {error ? (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
                                    {error}
                                </div>
                            ) : null}

                            {isLoading ? (
                                <div className="rounded-xl border border-border bg-card p-6 text-center">
                                    <p className="text-sm text-muted-foreground">Loading care data...</p>
                                </div>
                            ) : null}

                            <RemindersBanner />

                            <WalkHistory
                                walks={todayWalks}
                                poopCount={todayPoopCount}
                                peeCount={todayPeeCount}
                                walksCount={todayWalksCount}
                                onDeleteWalk={noopDelete}
                                onUpdateWalk={noopUpdate}
                            />

                            <DailyRoutines />
                            <ReminderManager />
                            <Leaderboard weeklyPoints={weeklyPoints} />
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-5">
                        <HistoryView />
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-5">
                        <Analytics />
                    </TabsContent>
                </Tabs>

                <footer className="border-t border-border/60 pt-5 text-center text-xs text-muted-foreground">
                    Shared publicly as read-only via portfolio
                </footer>
            </main>
        </div>
    )
}

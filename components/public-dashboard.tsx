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
        monthlyPoints,
        isLoading,
        error,
    } = useLogs()

    const noopDelete = async () => {}
    const noopUpdate = async () => {}

    return (
        <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,hsl(34_100%_94%),transparent_28%),radial-gradient(circle_at_left_bottom,hsl(18_85%_93%),transparent_30%),linear-gradient(180deg,hsl(35_38%_98%),hsl(var(--background))_42%)] text-foreground">
            <header className="sticky top-0 z-50 border-b border-border/70 bg-background/86 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
                    <div className="space-y-1">
                        <p className="text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
                            Pepper&apos;s Portal
                        </p>
                        <h1 className="font-serif text-[1.9rem] font-semibold leading-none sm:text-[2.15rem]">
                            Live Read-Only Dashboard
                        </h1>
                        <p className="max-w-md text-sm text-muted-foreground">
                            A lightweight view of Pepper&apos;s care dashboard for checking in from anywhere.
                        </p>
                    </div>

                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800">
                        View only
                    </span>
                </div>
            </header>

            <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5">
                {!isLoading && latestWalk ? <LastWalkCard walk={latestWalk} /> : null}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                    <TabsList className="h-12 rounded-full border border-border/70 bg-white/75 p-1 shadow-[0_18px_30px_-30px_rgba(70,39,16,0.35)]">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="today" className="mt-4">
                        <div className="space-y-4">
                            {error ? (
                                <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            ) : null}

                            {isLoading ? (
                                <div className="rounded-[1.5rem] border border-border bg-white/75 p-6 text-center shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
                                    <p className="text-sm text-muted-foreground">Loading care data...</p>
                                </div>
                            ) : null}

                            <RemindersBanner />

                            {!isLoading ? (
                                <WalkHistory
                                    walks={todayWalks}
                                    poopCount={todayPoopCount}
                                    peeCount={todayPeeCount}
                                    walksCount={todayWalksCount}
                                    onDeleteWalk={noopDelete}
                                    onUpdateWalk={noopUpdate}
                                />
                            ) : null}

                            <DailyRoutines />
                            <ReminderManager />
                            {!isLoading ? <Leaderboard monthlyPoints={monthlyPoints} /> : null}
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                        <HistoryView />
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-4">
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

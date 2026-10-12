'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useLogs } from '@/hooks/use-logs'
import { useMonthlyChampion } from '@/hooks/use-champion'
import { WalkHistory } from './walk-history'
import { DailyScoreboard } from './daily-scoreboard'
import { Leaderboard } from './leaderboard'
import { DailyRoutines } from './daily-routines'
import { RemindersBanner } from './reminders-banner'
import { ReminderManager } from './reminder-manager'
import { LastWalkCard } from './last-walk-card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const HistoryView = dynamic(() => import('./history-view').then(module => module.HistoryView))
const Analytics = dynamic(() => import('./analytics').then(module => module.Analytics))

type TabValue = 'today' | 'history' | 'analytics'

export function PublicDashboard() {
    const [activeTab, setActiveTab] = useState<TabValue>('today')
    const [visitedTabs, setVisitedTabs] = useState<TabValue[]>(['today'])
    const {
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        todayWalks,
        latestWalk,
        monthlyPoints,
        isLoading,
        isRefreshing,
        hasLoaded,
        error,
        refetch,
    } = useLogs()
    const { champion, monthLabel } = useMonthlyChampion()

    const noopDelete = async () => { }
    const noopUpdate = async () => { }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(32_100%_95%),hsl(var(--background))_36%),radial-gradient(circle_at_20%_120%,hsl(18_85%_94%),transparent_42%)] text-foreground dark:bg-[radial-gradient(circle_at_top_right,hsl(28_45%_13%),hsl(var(--background))_40%),radial-gradient(circle_at_20%_120%,hsl(14_45%_12%),transparent_44%)]">
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
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                        View Only
                    </span>
                </div>
            </header>

            <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
                <LastWalkCard walk={latestWalk} isLoading={isLoading} isRefreshing={isRefreshing} error={error} onRetry={() => void refetch()} />

                <Tabs value={activeTab} onValueChange={(v) => {
                    const tab = v as TabValue
                    setActiveTab(tab)
                    setVisitedTabs(previous => previous.includes(tab) ? previous : [...previous, tab])
                }}>
                    <TabsList className="h-14 rounded-xl border border-border/80 bg-card p-1">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="today" className="mt-5">
                        <div className="space-y-5">
                            <DailyScoreboard
                                poopCount={todayPoopCount}
                                peeCount={todayPeeCount}
                                walksCount={todayWalksCount}
                                isLoading={isLoading}
                                unavailable={!hasLoaded && Boolean(error)}
                            />
                            <WalkHistory
                                walks={todayWalks}
                                onDeleteWalk={noopDelete}
                                onUpdateWalk={noopUpdate}
                                isLoading={isLoading}
                                unavailable={!hasLoaded && Boolean(error)}
                            />

                            <RemindersBanner />
                            <DailyRoutines />
                            <ReminderManager />
                            {hasLoaded ? (
                                <Leaderboard
                                    monthlyPoints={monthlyPoints}
                                    champion={champion}
                                    championMonth={monthLabel}
                                />
                            ) : null}
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-5">
                        {visitedTabs.includes('history') ? <HistoryView /> : null}
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-5">
                        {visitedTabs.includes('analytics') ? <Analytics /> : null}
                    </TabsContent>
                </Tabs>

                <footer className="border-t border-border/60 pt-5 text-center text-xs text-muted-foreground">
                    Shared publicly as read-only via portfolio
                </footer>
            </main>
        </div>
    )
}

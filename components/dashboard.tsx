'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { ReadOnlyProvider } from '@/lib/read-only-context'
import { useLogs } from '@/hooks/use-logs'
import { useWriteAccess } from '@/hooks/use-write-access'
import { WalkHistory } from './walk-history'
import { LogWalkButton } from './log-walk-button'
import { Leaderboard } from './leaderboard'
import { DailyRoutines } from './daily-routines'
import { RemindersBanner } from './reminders-banner'
import { ReminderManager } from './reminder-manager'
import { HistoryView } from './history-view'
import { Analytics } from './analytics'
import { LastWalkCard } from './last-walk-card'
import { WriteAccessPanel } from './write-access-panel'
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
        latestWalk,
        weeklyPoints,
        addWalk,
        deleteWalk,
        updateWalk,
        isLoading,
        error,
    } = useLogs()

    const {
        isUnlocked,
        isLoading: isAuthLoading,
        hasResolvedStatus,
        error: accessError,
        unlock,
        lock,
    } = useWriteAccess()
    const canEdit = hasResolvedStatus && isUnlocked

    if (!user) return null

    return (
        <ReadOnlyProvider isReadOnly={!canEdit}>
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(32_100%_95%),hsl(var(--background))_36%),radial-gradient(circle_at_20%_120%,hsl(18_85%_94%),transparent_42%)] text-foreground">
                <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
                        <div>
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                Pepper&apos;s Portal
                            </p>
                            <h1 className="font-serif text-xl font-semibold leading-tight">
                                Daily Care Dashboard
                            </h1>
                            <p className="text-xs text-muted-foreground">Logged in as {user}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {canEdit ? (
                                <Button variant="outline" size="sm" onClick={() => void lock()}>
                                    Lock Editing
                                </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => setUser(null)}>
                                Switch User
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
                    {!hasResolvedStatus ? (
                        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            Checking editing access...
                        </div>
                    ) : null}

                    {hasResolvedStatus && !isUnlocked ? (
                        <WriteAccessPanel
                            onUnlock={unlock}
                            isLoading={isAuthLoading}
                            error={accessError}
                        />
                    ) : null}

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

                                {!isLoading ? (
                                    <WalkHistory
                                        walks={todayWalks}
                                        poopCount={todayPoopCount}
                                        peeCount={todayPeeCount}
                                        walksCount={todayWalksCount}
                                        onDeleteWalk={deleteWalk}
                                        onUpdateWalk={updateWalk}
                                    />
                                ) : null}

                                {!hasResolvedStatus ? (
                                    <p className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                                        Checking editing access...
                                    </p>
                                ) : canEdit ? (
                                    <section className="space-y-2">
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Quick Log
                                        </p>
                                        <LogWalkButton userName={user} onLogWalk={addWalk} />
                                    </section>
                                ) : (
                                    <p className="rounded-xl border border-amber-600/25 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                                        Unlock editing to log walks, routines, and reminders.
                                    </p>
                                )}

                                <DailyRoutines />
                                <ReminderManager />
                                {!isLoading ? <Leaderboard weeklyPoints={weeklyPoints} /> : null}
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
                        Pepper&apos;s Portal • family care tracker
                    </footer>
                </main>
            </div>
        </ReadOnlyProvider>
    )
}

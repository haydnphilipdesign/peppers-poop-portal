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
        monthlyPoints,
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
            <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,hsl(34_100%_94%),transparent_28%),radial-gradient(circle_at_left_bottom,hsl(18_85%_93%),transparent_30%),linear-gradient(180deg,hsl(35_38%_98%),hsl(var(--background))_42%)] text-foreground">
                <header className="sticky top-0 z-50 border-b border-border/70 bg-background/86 backdrop-blur-xl">
                    <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <p className="text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
                                    Pepper&apos;s Portal
                                </p>
                                <h1 className="font-serif text-[1.9rem] font-semibold leading-none sm:text-[2.15rem]">
                                    Daily Care Dashboard
                                </h1>
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Quick walk logging, routines, and reminders for the family.
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-sm text-amber-950/80">
                                <span className="font-medium">Signed in as {user}</span>
                                <span className="text-amber-500/70">•</span>
                                <span>{canEdit ? 'Editing on' : 'Read only'}</span>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {canEdit ? (
                                <Button variant="outline" size="sm" onClick={() => void lock()} className="rounded-full">
                                    Lock editing
                                </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => setUser(null)} className="rounded-full">
                                Switch user
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5">
                    {!hasResolvedStatus ? (
                        <div className="rounded-[1.5rem] border border-border bg-white/75 p-4 text-sm text-muted-foreground shadow-[0_18px_40px_-34px_rgba(70,39,16,0.35)]">
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
                                        onDeleteWalk={deleteWalk}
                                        onUpdateWalk={updateWalk}
                                    />
                                ) : null}

                                {canEdit ? (
                                    <section className="space-y-2 rounded-[1.75rem] border border-amber-200/70 bg-[linear-gradient(135deg,hsl(39_100%_96%),hsl(28_100%_94%))] p-4 shadow-[0_20px_50px_-42px_rgba(133,78,14,0.55)]">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.24em] text-amber-900/70">
                                                Quick log
                                            </p>
                                            <p className="mt-1 text-sm text-amber-950/75">
                                                Designed for one-handed updates while you&apos;re out with Pepper.
                                            </p>
                                        </div>
                                        <LogWalkButton userName={user} onLogWalk={addWalk} />
                                    </section>
                                ) : hasResolvedStatus ? (
                                    <p className="rounded-[1.4rem] border border-amber-200 bg-amber-50/75 px-4 py-3 text-sm text-amber-900">
                                        Unlock editing to log walks, routines, and reminders.
                                    </p>
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
                        Pepper&apos;s Portal • family care tracker
                    </footer>
                </main>
            </div>
        </ReadOnlyProvider>
    )
}

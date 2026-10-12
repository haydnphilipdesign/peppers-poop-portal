'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useUser } from '@/lib/user-context'
import { ReadOnlyProvider } from '@/lib/read-only-context'
import { useLogs } from '@/hooks/use-logs'
import { useWriteAccess } from '@/hooks/use-write-access'
import { useMonthlyChampion } from '@/hooks/use-champion'
import { WalkHistory } from './walk-history'
import { DailyScoreboard } from './daily-scoreboard'
import { LogWalkButton } from './log-walk-button'
import { Leaderboard } from './leaderboard'
import { DailyRoutines } from './daily-routines'
import { RemindersBanner } from './reminders-banner'
import { ReminderManager } from './reminder-manager'
import { LastWalkCard } from './last-walk-card'
import { WriteAccessPanel } from './write-access-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer'

const HistoryView = dynamic(() => import('./history-view').then(module => module.HistoryView), {
    loading: () => <p role="status" className="p-6 text-center">Loading history...</p>,
})
const Analytics = dynamic(() => import('./analytics').then(module => module.Analytics), {
    loading: () => <p role="status" className="p-6 text-center">Loading analytics...</p>,
})

type TabValue = 'today' | 'history' | 'analytics'

export function Dashboard() {
    const { user, setUser } = useUser()
    const [activeTab, setActiveTab] = useState<TabValue>('today')
    const [visitedTabs, setVisitedTabs] = useState<TabValue[]>(['today'])
    const [unlockOpen, setUnlockOpen] = useState(false)
    const quickLogRef = useRef<HTMLElement>(null)
    const {
        todayPoopCount,
        todayPeeCount,
        todayWalksCount,
        todayWalks,
        latestWalk,
        monthlyPoints,
        latestIsLoading,
        latestIsRefreshing,
        latestError,
        scoringError,
        scoringHasLoaded,
        refetchScoring,
        addWalk,
        deleteWalk,
        updateWalk,
        isLoading,
        isRefreshing,
        hasLoaded,
        error,
        refetch,
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

    const { champion, monthLabel } = useMonthlyChampion()
    const isReigningChamp = Boolean(user && champion?.winners.includes(user))

    if (!user) return null

    return (
        <ReadOnlyProvider isReadOnly={!canEdit} onRequireUnlock={() => setUnlockOpen(true)}>
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(32_100%_95%),hsl(var(--background))_36%),radial-gradient(circle_at_20%_120%,hsl(18_85%_94%),transparent_42%)] text-foreground dark:bg-[radial-gradient(circle_at_top_right,hsl(28_45%_13%),hsl(var(--background))_40%),radial-gradient(circle_at_20%_120%,hsl(14_45%_12%),transparent_44%)]">
                <header className="border-b border-border/70 bg-background/90">
                    <div className="mx-auto w-full max-w-2xl px-4 py-3">
                        <div>
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                Pepper&apos;s Portal
                            </p>
                            <h1 className="font-serif text-xl font-semibold leading-tight">
                                Daily Care Dashboard
                            </h1>
                            <p className="text-sm text-muted-foreground">Logged in as {user}</p>
                            {/* Reserve room for the asynchronous crown. */}
                            <div className="flex h-6 items-center">
                                {isReigningChamp ? (
                                    <p className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                                        👑 Reigning champ · {monthLabel}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                    </div>
                </header>

                <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
                    {/* Always mounted, above every asynchronous section. */}
                    <section ref={quickLogRef} aria-label="Log a walk">
                        <LogWalkButton
                            userName={user}
                            onLogWalk={addWalk}
                            disabled={!hasResolvedStatus}
                            onRequireUnlock={canEdit ? undefined : () => setUnlockOpen(true)}
                            hint={!hasResolvedStatus ? 'Checking editing access...' : accessError ? 'Editing access needs attention. Please try again.' : canEdit ? `Logging as ${user}` : 'Enter the family PIN to log a walk.'}
                        />
                    </section>

                    <Drawer open={unlockOpen} onOpenChange={setUnlockOpen} dismissible={!isAuthLoading}>
                        <DrawerContent className="overflow-y-auto bg-background" onCloseAutoFocus={(event) => {
                            event.preventDefault()
                            quickLogRef.current?.querySelector('button')?.focus()
                        }}>
                            <div className="mx-auto w-full max-w-sm">
                                <DrawerHeader>
                                    <DrawerTitle className="text-xl">Unlock Editing</DrawerTitle>
                                    <DrawerDescription>Enter the family PIN to log walks and update Pepper&apos;s care.</DrawerDescription>
                                </DrawerHeader>
                                <WriteAccessPanel
                                    onUnlock={async (pin) => {
                                        const success = await unlock(pin)
                                        if (success) setUnlockOpen(false)
                                        return success
                                    }}
                                    isLoading={isAuthLoading}
                                    error={accessError}
                                />
                                <DrawerFooter>
                                    <DrawerClose asChild><Button variant="outline" disabled={isAuthLoading}>Cancel</Button></DrawerClose>
                                </DrawerFooter>
                            </div>
                        </DrawerContent>
                    </Drawer>

                    <Tabs value={activeTab} onValueChange={(v) => {
                        const tab = v as TabValue
                        setActiveTab(tab)
                        setVisitedTabs(previous => previous.includes(tab) ? previous : [...previous, tab])
                    }}>
                        <TabsList className="h-auto min-h-14 rounded-xl border border-border/80 bg-card p-1">
                            <TabsTrigger value="today">Today</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        </TabsList>

                        <TabsContent value="today" className="mt-5">
                            <div className="space-y-5">
                                <LastWalkCard walk={latestWalk} isLoading={latestIsLoading} isRefreshing={latestIsRefreshing} error={latestError} onRetry={() => void refetch()} />
                                {error ? <div role="alert" className="rounded-xl border border-amber-500/30 p-4 text-sm">
                                    <p>{error}</p>
                                    <Button variant="outline" className="mt-2" disabled={isRefreshing || isLoading} onClick={() => void refetch()}>Refresh today&apos;s walks</Button>
                                </div> : null}
                                <RemindersBanner />
                                <DailyRoutines />
                                <DailyScoreboard
                                    poopCount={todayPoopCount}
                                    peeCount={todayPeeCount}
                                    walksCount={todayWalksCount}
                                    isLoading={isLoading}
                                    unavailable={!hasLoaded && Boolean(error)}
                                />
                                <WalkHistory
                                    walks={todayWalks}
                                    updatesBlocked={isRefreshing || Boolean(error)}
                                    onDeleteWalk={deleteWalk}
                                    onUpdateWalk={updateWalk}
                                    isLoading={isLoading}
                                    unavailable={!hasLoaded && Boolean(error)}
                                />

                                <ReminderManager />
                                <details className="rounded-xl border border-border/70 bg-card">
                                    <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium">Monthly leaderboard</summary>
                                    <div className="space-y-3 px-3 pb-3">
                                        {scoringError ? <div role="alert" className="rounded-xl border border-amber-500/30 p-4 text-sm">
                                            <p>{scoringError}</p>
                                            <Button variant="outline" className="mt-2" onClick={() => void refetchScoring()}>Refresh leaderboard</Button>
                                        </div> : !scoringHasLoaded ? <p role="status" className="p-4 text-sm text-muted-foreground">Loading leaderboard...</p> : null}
                                        {scoringHasLoaded ? (
                                            <Leaderboard
                                                monthlyPoints={monthlyPoints}
                                                champion={champion}
                                                championMonth={monthLabel}
                                            />
                                        ) : null}
                                    </div>
                                </details>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="mt-5">
                            {visitedTabs.includes('history') ? <HistoryView /> : null}
                        </TabsContent>

                        <TabsContent value="analytics" className="mt-5">
                            {visitedTabs.includes('analytics') ? <Analytics /> : null}
                        </TabsContent>
                    </Tabs>

                    <footer className="border-t border-border/60 pt-5 text-sm text-muted-foreground">
                        <details className="rounded-xl border border-border/60 bg-card">
                            <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium text-foreground">Profile &amp; access</summary>
                            <div className="space-y-3 px-4 pb-4">
                                <p>Profile: {user} · {canEdit ? 'Editing enabled' : 'Editing locked'}</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" disabled={isAuthLoading} onClick={() => canEdit ? void lock() : setUnlockOpen(true)}>
                                        {canEdit ? 'Lock Editing' : 'Unlock Editing'}
                                    </Button>
                                    <Button variant="outline" disabled={isAuthLoading} onClick={() => setUser(null)}>
                                        Switch User
                                    </Button>
                                </div>
                                {accessError ? <p role="alert">{accessError}</p> : null}
                            </div>
                        </details>
                        <p className="pt-4 text-center text-xs">Pepper&apos;s Portal • family care tracker</p>
                    </footer>
                </main>
            </div>
        </ReadOnlyProvider>
    )
}

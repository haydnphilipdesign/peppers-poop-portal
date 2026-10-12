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
        <ReadOnlyProvider isReadOnly={!canEdit}>
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(32_100%_95%),hsl(var(--background))_36%),radial-gradient(circle_at_20%_120%,hsl(18_85%_94%),transparent_42%)] text-foreground dark:bg-[radial-gradient(circle_at_top_right,hsl(28_45%_13%),hsl(var(--background))_40%),radial-gradient(circle_at_20%_120%,hsl(14_45%_12%),transparent_44%)]">
                <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-2xl flex-col items-start justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center">
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

                        <div className="flex w-full items-center gap-2 sm:w-auto">
                            <Button variant="outline" className="flex-1 sm:flex-none" disabled={isAuthLoading} onClick={() => canEdit ? void lock() : setUnlockOpen(true)}>
                                {canEdit ? 'Lock Editing' : 'Unlock Editing'}
                            </Button>
                            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setUser(null)}>
                                Switch User
                            </Button>
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
                        <TabsList className="h-14 rounded-xl border border-border/80 bg-card p-1">
                            <TabsTrigger value="today">Today</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        </TabsList>

                        <TabsContent value="today" className="mt-5">
                            <div className="space-y-5">
                                <LastWalkCard walk={latestWalk} isLoading={isLoading} isRefreshing={isRefreshing} error={error} onRetry={() => void refetch()} />
                                <DailyScoreboard
                                    poopCount={todayPoopCount}
                                    peeCount={todayPeeCount}
                                    walksCount={todayWalksCount}
                                    isLoading={isLoading}
                                    unavailable={!hasLoaded && Boolean(error)}
                                />
                                <WalkHistory
                                    walks={todayWalks}
                                    onDeleteWalk={deleteWalk}
                                    onUpdateWalk={updateWalk}
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
                        Pepper&apos;s Portal • family care tracker
                    </footer>
                </main>
            </div>
        </ReadOnlyProvider>
    )
}

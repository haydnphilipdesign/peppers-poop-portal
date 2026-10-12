'use client'

import { useEffect, useRef, useState } from 'react'
import { SaveFeedback } from '@/components/save-feedback'
import { Button } from '@/components/ui/button'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer'
import type { SavedWalk } from '@/lib/api-types'
import type { UserName } from '@/lib/database.types'
import { format, subDays, setHours, setMinutes } from 'date-fns'
import confetti from 'canvas-confetti'

type WalkType = 'poop' | 'pee' | 'both' | 'neither' | null

const outcomeLabels: Record<Exclude<WalkType, null>, string> = {
    poop: 'Poop',
    pee: 'Pee',
    both: 'Poop and pee',
    neither: 'Neither',
}

// Long enough to notice a mis-tap, short enough that Undo never removes an old walk.
const UNDO_WINDOW_MS = 60_000

interface LogWalkButtonProps {
    userName: UserName
    onLogWalk: (options: { draftId?: string; poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => Promise<SavedWalk | null | void>
    onUndoWalk?: (walk: SavedWalk) => Promise<void>
    disabled?: boolean
    onRequireUnlock?: () => void
    hint?: string
}

export function LogWalkButton({ userName, onLogWalk, onUndoWalk, disabled = false, onRequireUnlock, hint }: LogWalkButtonProps) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [isLogging, setIsLogging] = useState(false)
    const [showTimePicker, setShowTimePicker] = useState(false)
    const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today')
    const [hour, setHour] = useState(new Date().getHours())
    const [minute, setMinute] = useState(Math.floor(new Date().getMinutes() / 15) * 15)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [savedSummary, setSavedSummary] = useState<string | null>(null)
    const [undoTarget, setUndoTarget] = useState<SavedWalk | null>(null)
    const [isUndoing, setIsUndoing] = useState(false)
    const [undoMessage, setUndoMessage] = useState<{ text: string; failed: boolean } | null>(null)
    const saving = useRef(false)
    const draftId = useRef<string | undefined>(undefined)

    const handleOpenChange = (open: boolean) => {
        if (saving.current) return
        if (open) {
            draftId.current = crypto.randomUUID()
            const now = new Date()
            setHour(now.getHours())
            setMinute(Math.floor(now.getMinutes() / 15) * 15)
            setSelectedDay('today')
            setShowTimePicker(false)
            setSaveError(null)
            setSavedSummary(null)
            setUndoTarget(null)
            setUndoMessage(null)
        }
        setDrawerOpen(open)
    }

    useEffect(() => {
        if (!undoTarget) return
        const timer = window.setTimeout(() => setUndoTarget(null), UNDO_WINDOW_MS)
        return () => window.clearTimeout(timer)
    }, [undoTarget])

    const handleUndo = async () => {
        if (!undoTarget || !onUndoWalk || saving.current) return
        if (onRequireUnlock) { onRequireUnlock(); return }
        saving.current = true
        setIsUndoing(true)
        try {
            await onUndoWalk(undoTarget)
            setUndoTarget(null)
            setSavedSummary(null)
            setUndoMessage({ text: 'Walk removed.', failed: false })
        } catch (err) {
            // Keep Undo available: the entry is still there and can be retried or edited below.
            setUndoMessage({ text: `${err instanceof Error ? err.message : 'Unable to undo.'} You can also edit it in today’s walk log.`, failed: true })
        } finally {
            saving.current = false
            setIsUndoing(false)
        }
    }

    const triggerConfetti = () => {
        const count = 200
        const defaults = { origin: { y: 0.7 }, zIndex: 9999, disableForReducedMotion: true }

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) })
        }

        fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.2, y: 0.7 } })
        fire(0.2, { spread: 60, origin: { x: 0.4, y: 0.7 } })
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { x: 0.6, y: 0.7 } })
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { x: 0.8, y: 0.7 } })
        fire(0.1, { spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.7 } })
    }

    const handleLog = async (type: WalkType) => {
        if (!type || saving.current) return
        if (onRequireUnlock) { onRequireUnlock(); return }
        let createdAt: Date | undefined
        if (showTimePicker) {
            createdAt = selectedDay === 'today' ? new Date() : subDays(new Date(), 1)
            createdAt.setHours(hour, minute, 0, 0)
            if (createdAt > new Date()) {
                setSaveError('Choose a time that has already passed.')
                return
            }
        }
        saving.current = true
        setIsLogging(true)
        setSaveError(null)

        try {
            const poop = type === 'poop' || type === 'both'
            const pee = type === 'pee' || type === 'both'

            const saved = await onLogWalk({ draftId: draftId.current, poop, pee, userName, createdAt })

            // Celebrate every walk! 🎉
            triggerConfetti()

            setDrawerOpen(false)
            setSavedSummary(`${format(createdAt ?? new Date(), 'h:mm a')} · ${outcomeLabels[type]}`)
            setUndoTarget(saved ?? null)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save the walk. Please try again.')
        } finally {
            saving.current = false
            setIsLogging(false)
        }
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = [0, 15, 30, 45]

    return (
        <Drawer open={drawerOpen} onOpenChange={handleOpenChange} dismissible={!isLogging}>
            {/* Main Log Walk Button */}
            <DrawerTrigger asChild onClick={(event) => {
                if (onRequireUnlock) {
                    event.preventDefault()
                    onRequireUnlock()
                }
            }}>
                <Button
                    disabled={disabled}
                    className="w-full h-auto min-h-24 px-4 py-4 text-2xl font-bold bg-gradient-to-br from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-amber-50 shadow-lg transition-colors rounded-2xl border border-amber-300/30"
                >
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                        <span aria-hidden="true" className="text-4xl">🦮</span>
                        <span className="drop-shadow">Log Walk</span>
                    </div>
                </Button>
            </DrawerTrigger>
            {/* Fixed height: confirming or undoing a walk never moves the sections below. */}
            <div className="mt-1 flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
                {undoMessage?.failed ? <p role="alert" className="text-center">{undoMessage.text}</p> : (
                    <p role="status" className={`text-center ${savedSummary && !onRequireUnlock ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                        {savedSummary && !onRequireUnlock ? `✓ Walk saved · ${savedSummary}` : undoMessage?.text ?? hint}
                    </p>
                )}
                {undoTarget && onUndoWalk && !onRequireUnlock ? (
                    <Button variant="outline" disabled={isUndoing} onClick={() => void handleUndo()}>
                        {isUndoing ? 'Undoing...' : 'Undo'}
                    </Button>
                ) : null}
            </div>

            {/* Drawer */}
            <DrawerContent className="overflow-y-auto bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle className="text-2xl text-center">
                            🦮 Log Walk
                        </DrawerTitle>
                        <DrawerDescription className="text-center">
                            {showTimePicker ? 'Select time, then what Pepper did' : 'What did Pepper do on this walk?'}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-4">
                        {/* Time Picker (if shown) */}
                        {showTimePicker && (
                            <div className="space-y-4 pb-4 border-b border-border">
                                {/* Day Selection */}
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                        Day
                                    </label>
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12ch),1fr))] gap-3">
                                        <Button disabled={isLogging} aria-pressed={selectedDay === 'today'}
                                            variant={selectedDay === 'today' ? 'default' : 'outline'}
                                            onClick={() => setSelectedDay('today')}
                                            className="min-h-11"
                                        >
                                            Today
                                        </Button>
                                        <Button disabled={isLogging} aria-pressed={selectedDay === 'yesterday'}
                                            variant={selectedDay === 'yesterday' ? 'default' : 'outline'}
                                            onClick={() => setSelectedDay('yesterday')}
                                            className="min-h-11"
                                        >
                                            Yesterday
                                        </Button>
                                    </div>
                                </div>

                                {/* Time Selection */}
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                        Time
                                    </label>
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12ch),1fr))] gap-3">
                                        <select
                                            aria-label="Hour"
                                            disabled={isLogging}
                                            value={hour}
                                            onChange={(e) => setHour(parseInt(e.target.value))}
                                            className="min-h-11 min-w-0 w-full rounded-xl border border-input bg-background px-2 py-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {hours.map((h) => (
                                                <option key={h} value={h}>
                                                    {format(setHours(new Date(), h), 'h a')}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            aria-label="Minute"
                                            disabled={isLogging}
                                            value={minute}
                                            onChange={(e) => setMinute(parseInt(e.target.value))}
                                            className="min-h-11 min-w-0 w-full rounded-xl border border-input bg-background px-2 py-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {minutes.map((m) => (
                                                <option key={m} value={m}>
                                                    :{m.toString().padStart(2, '0')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
                                    <span className="text-emerald-800 dark:text-emerald-300">
                                        Logging walk at{' '}
                                        <strong>
                                            {format(
                                                setMinutes(
                                                    setHours(
                                                        selectedDay === 'today' ? new Date() : subDays(new Date(), 1),
                                                        hour
                                                    ),
                                                    minute
                                                ),
                                                "EEEE 'at' h:mm a"
                                            )}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* What did Pepper do? */}
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12ch),1fr))] gap-3">
                            <Button
                                onClick={() => void handleLog('poop')}
                                disabled={isLogging}
                                className="h-auto min-h-24 py-3 flex-col gap-1 bg-gradient-to-br from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white rounded-2xl text-lg font-bold shadow-lg border border-amber-400/30"
                            >
                                <span aria-hidden="true" className="text-3xl">💩</span>
                                <span>Poop</span>
                            </Button>
                            <Button
                                onClick={() => void handleLog('pee')}
                                disabled={isLogging}
                                className="h-auto min-h-24 py-3 flex-col gap-1 bg-gradient-to-br from-sky-700 to-cyan-700 hover:from-sky-800 hover:to-cyan-800 text-white rounded-2xl text-lg font-bold shadow-lg border border-sky-400/30"
                            >
                                <span aria-hidden="true" className="text-3xl">💦</span>
                                <span>Pee</span>
                            </Button>
                            <Button
                                aria-label="Both poop and pee"
                                onClick={() => void handleLog('both')}
                                disabled={isLogging}
                                className="h-auto min-h-24 py-3 flex-col gap-1 bg-gradient-to-br from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-2xl text-lg font-bold shadow-lg border border-emerald-400/30"
                            >
                                <span aria-hidden="true" className="text-3xl">💩💦</span>
                                <span>Both</span>
                            </Button>
                        </div>

                        <Button variant="outline" disabled={isLogging} onClick={() => void handleLog('neither')} className="w-full min-h-12 text-base">
                            Neither — no poop or pee
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">Every walk counts toward the walk goal and earns 5 points. Neither adds no bathroom events.</p>
                        <SaveFeedback error={saveError} />
                        <p role="status" className="text-center text-sm text-muted-foreground">{isLogging ? 'Saving walk...' : ''}</p>
                        {/* Log for earlier toggle */}
                        {!showTimePicker && (
                            <div className="text-center pt-2">
                                <button
                                    disabled={isLogging}
                                    onClick={() => setShowTimePicker(true)}
                                    className="min-h-11 px-3 text-base text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                                >
                                    ⏰ Log for earlier?
                                </button>
                            </div>
                        )}
                    </div>

                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline" className="h-12" disabled={isLogging}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

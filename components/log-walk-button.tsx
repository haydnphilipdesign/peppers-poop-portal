'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'
import type { UserName } from '@/lib/database.types'
import { format, setHours, setMinutes, subDays } from 'date-fns'
import confetti from 'canvas-confetti'
import { Clock3, Footprints } from 'lucide-react'

type WalkType = 'poop' | 'pee' | 'both' | null

interface LogWalkButtonProps {
    userName: UserName
    onLogWalk: (options: { poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => Promise<void>
}

export function LogWalkButton({ userName, onLogWalk }: LogWalkButtonProps) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [isLogging, setIsLogging] = useState(false)
    const [showTimePicker, setShowTimePicker] = useState(false)
    const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today')
    const [hour, setHour] = useState(new Date().getHours())
    const [minute, setMinute] = useState(Math.floor(new Date().getMinutes() / 15) * 15)

    const triggerConfetti = () => {
        const count = 200
        const defaults = { origin: { y: 0.7 }, zIndex: 9999 }

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) })
        }

        fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.2, y: 0.7 } })
        fire(0.2, { spread: 60, origin: { x: 0.4, y: 0.7 } })
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { x: 0.6, y: 0.7 } })
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { x: 0.8, y: 0.7 } })
        fire(0.1, { spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.7 } })
    }

    const handleQuickLog = async (type: WalkType) => {
        if (!type) return
        setIsLogging(true)

        try {
            const poop = type === 'poop' || type === 'both'
            const pee = type === 'pee' || type === 'both'

            await onLogWalk({ poop, pee, userName })

            setTimeout(() => triggerConfetti(), 100)
            setDrawerOpen(false)
        } finally {
            setIsLogging(false)
        }
    }

    const handleTimePickerLog = async (type: WalkType) => {
        if (!type) return
        setIsLogging(true)

        try {
            let date = selectedDay === 'today' ? new Date() : subDays(new Date(), 1)
            date = setHours(date, hour)
            date = setMinutes(date, minute)

            const poop = type === 'poop' || type === 'both'
            const pee = type === 'pee' || type === 'both'

            await onLogWalk({ poop, pee, userName, createdAt: date })

            setTimeout(() => triggerConfetti(), 100)
            setDrawerOpen(false)
            setShowTimePicker(false)
        } finally {
            setIsLogging(false)
        }
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = [0, 15, 30, 45]
    const previewDate = setMinutes(
        setHours(selectedDay === 'today' ? new Date() : subDays(new Date(), 1), hour),
        minute
    )

    return (
        <>
            <Button
                onClick={() => setDrawerOpen(true)}
                className="h-auto w-full rounded-[1.6rem] border border-amber-300/50 bg-[linear-gradient(135deg,hsl(31_85%_40%),hsl(18_80%_45%))] px-5 py-4 text-left text-amber-50 shadow-[0_24px_50px_-34px_rgba(121,60,17,0.58)] transition-transform duration-200 hover:-translate-y-0.5 hover:from-amber-700 hover:to-orange-700"
            >
                <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-white/12 p-3">
                        <Footprints className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">Log a walk</p>
                        <p className="mt-1 text-sm text-amber-100/85">
                            Quick update for {userName}. Tap once, choose what happened, done.
                        </p>
                    </div>
                </div>
            </Button>

            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent className="bg-[linear-gradient(180deg,hsl(38_70%_98%),hsl(32_42%_96%))]">
                    <div className="mx-auto w-full max-w-md">
                        <DrawerHeader>
                            <DrawerTitle className="text-center text-2xl">Log Pepper&apos;s walk</DrawerTitle>
                            <DrawerDescription className="mx-auto max-w-sm text-center text-sm leading-6">
                                {showTimePicker
                                    ? 'Choose when the walk happened, then record what Pepper did.'
                                    : 'Pick the result of the walk. This is designed to be quick on your phone.'}
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="space-y-4 px-4 pb-2">
                            {showTimePicker ? (
                                <div className="rounded-[1.4rem] border border-amber-200 bg-white/75 p-4 shadow-sm">
                                    <div className="grid gap-4">
                                        <div>
                                            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                Day
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant={selectedDay === 'today' ? 'default' : 'outline'}
                                                    onClick={() => setSelectedDay('today')}
                                                    className="h-11 rounded-2xl"
                                                >
                                                    Today
                                                </Button>
                                                <Button
                                                    variant={selectedDay === 'yesterday' ? 'default' : 'outline'}
                                                    onClick={() => setSelectedDay('yesterday')}
                                                    className="h-11 rounded-2xl"
                                                >
                                                    Yesterday
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                Time
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={hour}
                                                    onChange={(e) => setHour(parseInt(e.target.value))}
                                                    className="h-11 rounded-2xl border border-input bg-background px-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    {hours.map((h) => (
                                                        <option key={h} value={h}>
                                                            {format(setHours(new Date(), h), 'h a')}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={minute}
                                                    onChange={(e) => setMinute(parseInt(e.target.value))}
                                                    className="h-11 rounded-2xl border border-input bg-background px-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    {minutes.map((m) => (
                                                        <option key={m} value={m}>
                                                            :{m.toString().padStart(2, '0')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                            <Clock3 className="h-4 w-4 shrink-0" />
                                            Logging this walk for{' '}
                                            <strong>{format(previewDate, "EEEE 'at' h:mm a")}</strong>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-3 gap-3">
                                <WalkTypeButton
                                    emoji="💩"
                                    label="Poop"
                                    onClick={() => void (showTimePicker ? handleTimePickerLog('poop') : handleQuickLog('poop'))}
                                    disabled={isLogging}
                                    className="from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
                                />
                                <WalkTypeButton
                                    emoji="💦"
                                    label="Pee"
                                    onClick={() => void (showTimePicker ? handleTimePickerLog('pee') : handleQuickLog('pee'))}
                                    disabled={isLogging}
                                    className="from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500"
                                />
                                <WalkTypeButton
                                    emoji="💩💦"
                                    label="Both"
                                    onClick={() => void (showTimePicker ? handleTimePickerLog('both') : handleQuickLog('both'))}
                                    disabled={isLogging}
                                    className="from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600"
                                />
                            </div>

                            {!showTimePicker ? (
                                <div className="text-center">
                                    <button
                                        onClick={() => setShowTimePicker(true)}
                                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/75 hover:text-foreground"
                                    >
                                        <Clock3 className="h-4 w-4" />
                                        Log for an earlier time
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button variant="outline" className="h-12 rounded-2xl">
                                    Cancel
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    )
}

function WalkTypeButton({
    emoji,
    label,
    onClick,
    disabled,
    className,
}: {
    emoji: string
    label: string
    onClick: () => void
    disabled: boolean
    className: string
}) {
    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            className={`h-28 flex-col gap-2 rounded-[1.5rem] bg-gradient-to-br text-white shadow-[0_16px_34px_-24px_rgba(43,29,19,0.48)] ${className}`}
        >
            <span className="text-3xl">{emoji}</span>
            <span className="text-sm font-semibold">{label}</span>
        </Button>
    )
}

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
import { format, subDays, setHours, setMinutes } from 'date-fns'
import confetti from 'canvas-confetti'

type WalkType = 'poop' | 'pee' | 'both' | null

interface LogWalkButtonProps {
    userName: UserName
    todayPoopCount: number
    onLogWalk: (options: { poop: boolean; pee: boolean; userName: UserName; createdAt?: Date }) => Promise<void>
}

export function LogWalkButton({ userName, todayPoopCount, onLogWalk }: LogWalkButtonProps) {
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

            // Celebrate every walk! 🎉
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

            // Celebrate every walk! 🎉
            setTimeout(() => triggerConfetti(), 100)

            setDrawerOpen(false)
            setShowTimePicker(false)
        } finally {
            setIsLogging(false)
        }
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = [0, 15, 30, 45]

    return (
        <>
            {/* Main Log Walk Button */}
            <Button
                onClick={() => setDrawerOpen(true)}
                className="w-full h-24 text-2xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 rounded-2xl border border-emerald-400/30"
            >
                <div className="flex items-center gap-3">
                    <span className="text-4xl">🦮</span>
                    <span className="drop-shadow">Log Walk</span>
                </div>
            </Button>

            {/* Drawer */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent className="bg-background">
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
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant={selectedDay === 'today' ? 'default' : 'outline'}
                                                onClick={() => setSelectedDay('today')}
                                                className="h-11"
                                            >
                                                Today
                                            </Button>
                                            <Button
                                                variant={selectedDay === 'yesterday' ? 'default' : 'outline'}
                                                onClick={() => setSelectedDay('yesterday')}
                                                className="h-11"
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
                                        <div className="grid grid-cols-2 gap-3">
                                            <select
                                                value={hour}
                                                onChange={(e) => setHour(parseInt(e.target.value))}
                                                className="h-11 rounded-xl border border-input bg-background px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring"
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
                                                className="h-11 rounded-xl border border-input bg-background px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring"
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
                                        <span className="text-emerald-400">
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
                            <div className="grid grid-cols-3 gap-3">
                                <Button
                                    onClick={() => showTimePicker ? handleTimePickerLog('poop') : handleQuickLog('poop')}
                                    disabled={isLogging}
                                    className="h-24 flex-col gap-1 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl text-lg font-bold shadow-lg border border-amber-400/30"
                                >
                                    <span className="text-3xl">💩</span>
                                    <span>Poop</span>
                                </Button>
                                <Button
                                    onClick={() => showTimePicker ? handleTimePickerLog('pee') : handleQuickLog('pee')}
                                    disabled={isLogging}
                                    className="h-24 flex-col gap-1 bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white rounded-2xl text-lg font-bold shadow-lg border border-blue-400/30"
                                >
                                    <span className="text-3xl">💦</span>
                                    <span>Pee</span>
                                </Button>
                                <Button
                                    onClick={() => showTimePicker ? handleTimePickerLog('both') : handleQuickLog('both')}
                                    disabled={isLogging}
                                    className="h-24 flex-col gap-1 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white rounded-2xl text-lg font-bold shadow-lg border border-purple-400/30"
                                >
                                    <span className="text-3xl">💩💦</span>
                                    <span>Both</span>
                                </Button>
                            </div>

                            {/* Log for earlier toggle */}
                            {!showTimePicker && (
                                <div className="text-center pt-2">
                                    <button
                                        onClick={() => setShowTimePicker(true)}
                                        className="text-sm text-muted-foreground hover:text-emerald-400 underline underline-offset-4 transition-colors"
                                    >
                                        ⏰ Log for earlier?
                                    </button>
                                </div>
                            )}
                        </div>

                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button variant="outline" className="h-12">
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

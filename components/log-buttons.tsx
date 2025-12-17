'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TimePickerDrawer } from './time-picker-drawer'
import type { LogType, UserName } from '@/lib/database.types'
import confetti from 'canvas-confetti'

interface LogButtonsProps {
    userName: UserName
    todayPoopCount: number
    onLog: (type: LogType, userName: UserName, createdAt?: Date) => Promise<void>
}

export function LogButtons({ userName, todayPoopCount, onLog }: LogButtonsProps) {
    const [isLogging, setIsLogging] = useState<LogType | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [pendingLogType, setPendingLogType] = useState<LogType | null>(null)

    const triggerConfetti = () => {
        // Fire confetti from both sides
        const count = 200
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 9999,
        }

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
            })
        }

        fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.2, y: 0.7 } })
        fire(0.2, { spread: 60, origin: { x: 0.4, y: 0.7 } })
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { x: 0.6, y: 0.7 } })
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { x: 0.8, y: 0.7 } })
        fire(0.1, { spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.7 } })
    }

    const handleLog = async (type: LogType, createdAt?: Date) => {
        setIsLogging(type)
        try {
            await onLog(type, userName, createdAt)

            // Check if this was the 3rd poop
            if (type === 'poop' && todayPoopCount === 2) {
                // Small delay to let the UI update first
                setTimeout(() => {
                    triggerConfetti()
                }, 100)
            }
        } finally {
            setIsLogging(null)
        }
    }

    const handleTimePick = async (date: Date) => {
        if (pendingLogType) {
            await handleLog(pendingLogType, date)
            setPendingLogType(null)
        }
        setDrawerOpen(false)
    }

    const openTimePickerFor = (type: LogType) => {
        setPendingLogType(type)
        setDrawerOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* Main Log Buttons */}
            <div className="grid grid-cols-2 gap-4">
                {/* Poop Button */}
                <Button
                    onClick={() => handleLog('poop')}
                    disabled={isLogging !== null}
                    className="h-32 text-2xl font-bold bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 rounded-3xl border-4 border-amber-400/50"
                >
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-5xl drop-shadow-lg">💩</span>
                        <span className="drop-shadow">Log Poop</span>
                    </div>
                </Button>

                {/* Pee Button */}
                <Button
                    onClick={() => handleLog('pee')}
                    disabled={isLogging !== null}
                    className="h-32 text-2xl font-bold bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 rounded-3xl border-4 border-blue-400/50"
                >
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-5xl drop-shadow-lg">💦</span>
                        <span className="drop-shadow">Log Pee</span>
                    </div>
                </Button>
            </div>

            {/* Time Picker Link */}
            <div className="text-center">
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 transition-colors"
                >
                    ⏰ Log for earlier?
                </button>
            </div>

            {/* Time Picker Drawer */}
            <TimePickerDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onConfirm={handleTimePick}
                pendingType={pendingLogType}
                onTypeSelect={setPendingLogType}
            />
        </div>
    )
}

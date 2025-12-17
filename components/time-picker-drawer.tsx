'use client'

import { useState } from 'react'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import type { LogType } from '@/lib/database.types'
import { format, subDays, setHours, setMinutes } from 'date-fns'

interface TimePickerDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (date: Date) => void
    pendingType: LogType | null
    onTypeSelect: (type: LogType) => void
}

export function TimePickerDrawer({
    open,
    onOpenChange,
    onConfirm,
    pendingType,
    onTypeSelect,
}: TimePickerDrawerProps) {
    const now = new Date()
    const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today')
    const [hour, setHour] = useState(now.getHours())
    const [minute, setMinute] = useState(Math.floor(now.getMinutes() / 15) * 15)

    const handleConfirm = () => {
        let date = selectedDay === 'today' ? new Date() : subDays(new Date(), 1)
        date = setHours(date, hour)
        date = setMinutes(date, minute)
        onConfirm(date)
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = [0, 15, 30, 45]

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-stone-50 dark:bg-stone-900">
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle className="text-2xl text-center">
                            ⏰ Log for Earlier
                        </DrawerTitle>
                        <DrawerDescription className="text-center">
                            Select when this happened
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-6">
                        {/* Log Type Selection (if not already selected) */}
                        {!pendingType && (
                            <div>
                                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2 block">
                                    What are you logging?
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => onTypeSelect('poop')}
                                        className="h-16 text-lg"
                                    >
                                        💩 Poop
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => onTypeSelect('pee')}
                                        className="h-16 text-lg"
                                    >
                                        💦 Pee
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Day Selection */}
                        <div>
                            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2 block">
                                Day
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant={selectedDay === 'today' ? 'default' : 'outline'}
                                    onClick={() => setSelectedDay('today')}
                                    className="h-12"
                                >
                                    Today ({format(now, 'MMM d')})
                                </Button>
                                <Button
                                    variant={selectedDay === 'yesterday' ? 'default' : 'outline'}
                                    onClick={() => setSelectedDay('yesterday')}
                                    className="h-12"
                                >
                                    Yesterday ({format(subDays(now, 1), 'MMM d')})
                                </Button>
                            </div>
                        </div>

                        {/* Time Selection */}
                        <div>
                            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2 block">
                                Time
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Hour Select */}
                                <select
                                    value={hour}
                                    onChange={(e) => setHour(parseInt(e.target.value))}
                                    className="h-12 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    {hours.map((h) => (
                                        <option key={h} value={h}>
                                            {format(setHours(new Date(), h), 'h a')}
                                        </option>
                                    ))}
                                </select>

                                {/* Minute Select */}
                                <select
                                    value={minute}
                                    onChange={(e) => setMinute(parseInt(e.target.value))}
                                    className="h-12 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                        <div className="text-center p-4 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                Logging {pendingType === 'poop' ? '💩' : pendingType === 'pee' ? '💦' : '...'} at:
                            </p>
                            <p className="text-xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                                {format(
                                    setMinutes(
                                        setHours(
                                            selectedDay === 'today' ? new Date() : subDays(new Date(), 1),
                                            hour
                                        ),
                                        minute
                                    ),
                                    "EEEE, MMM d 'at' h:mm a"
                                )}
                            </p>
                        </div>
                    </div>

                    <DrawerFooter>
                        <Button
                            onClick={handleConfirm}
                            disabled={!pendingType}
                            className="h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        >
                            ✅ Confirm Log
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" className="h-12">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

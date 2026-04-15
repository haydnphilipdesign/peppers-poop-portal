'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isToday as isTodayDate, parseISO, setHours, setMinutes, startOfDay } from 'date-fns'
import { CalendarDays, Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHistory } from '@/hooks/use-history'
import { useReadOnly } from '@/lib/read-only-context'
import { useUser } from '@/lib/user-context'
import type { RoutineStatus } from '@/lib/activity-utils'
import type { ActivityType, UserName } from '@/lib/database.types'
import type { Walk } from '@/lib/domain/metrics'

const USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

const userColors: Record<UserName, string> = {
    Chris: 'bg-blue-500/10 border-blue-500/20',
    Debbie: 'bg-pink-500/10 border-pink-500/20',
    Haydn: 'bg-emerald-500/10 border-emerald-500/20',
}

function getDefaultWalkTimeValue() {
    const now = new Date()
    const roundedMinutes = Math.floor(now.getMinutes() / 15) * 15
    return `${now.getHours().toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`
}

function combineDateAndTime(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map(Number)
    return setMinutes(setHours(startOfDay(date), hours), minutes)
}

export function HistoryView() {
    const { user } = useUser()
    const isReadOnly = useReadOnly()
    const {
        selectedDate,
        setSelectedDate,
        dayStats,
        toysStatus,
        dinnerStatus,
        isLoading,
        error,
        goToPreviousDay,
        goToNextDay,
        isToday,
        addWalk,
        updateWalk,
        deleteWalk,
        logActivity,
        updateActivity,
        deleteActivity,
    } = useHistory()

    const [showAddWalk, setShowAddWalk] = useState(false)
    const [addWalker, setAddWalker] = useState<UserName>(user ?? 'Chris')
    const [addTime, setAddTime] = useState(getDefaultWalkTimeValue)
    const [addPoop, setAddPoop] = useState(false)
    const [addPee, setAddPee] = useState(false)
    const [isAddingWalk, setIsAddingWalk] = useState(false)

    const [editingWalk, setEditingWalk] = useState<Walk | null>(null)
    const [editPoop, setEditPoop] = useState(false)
    const [editPee, setEditPee] = useState(false)
    const [editUser, setEditUser] = useState<UserName>(user ?? 'Chris')
    const [editTime, setEditTime] = useState('')
    const [savingWalkId, setSavingWalkId] = useState<string | null>(null)
    const [deletingWalkId, setDeletingWalkId] = useState<string | null>(null)

    const [editingRoutine, setEditingRoutine] = useState<ActivityType | null>(null)
    const [savingRoutine, setSavingRoutine] = useState<ActivityType | null>(null)
    const [deletingRoutine, setDeletingRoutine] = useState<ActivityType | null>(null)

    const routineStatuses = useMemo(() => [toysStatus, dinnerStatus], [toysStatus, dinnerStatus])
    const selectedDateInput = format(selectedDate, 'yyyy-MM-dd')
    const fullDateLabel = format(selectedDate, 'EEEE, MMMM d, yyyy')

    useEffect(() => {
        setShowAddWalk(false)
        setAddWalker(user ?? 'Chris')
        setAddTime(getDefaultWalkTimeValue())
        setAddPoop(false)
        setAddPee(false)
        setEditingWalk(null)
        setEditingRoutine(null)
    }, [selectedDate, user])

    const handleDateChange = (value: string) => {
        if (!value) return
        setSelectedDate(parseISO(value))
    }

    const handleStartEdit = (walk: Walk) => {
        setEditingWalk(walk)
        setEditPoop(walk.hasPoop)
        setEditPee(walk.hasPee)
        setEditUser(walk.userName)
        setEditTime(format(walk.time, 'HH:mm'))
    }

    const handleAddWalk = async () => {
        if (!user || (!addPoop && !addPee)) return

        setIsAddingWalk(true)
        try {
            await addWalk({
                poop: addPoop,
                pee: addPee,
                userName: addWalker,
                createdAt: combineDateAndTime(selectedDate, addTime),
            })

            setShowAddWalk(false)
            setAddTime(getDefaultWalkTimeValue())
            setAddPoop(false)
            setAddPee(false)
            setAddWalker(user)
        } finally {
            setIsAddingWalk(false)
        }
    }

    const handleSaveWalk = async () => {
        if (!editingWalk || (!editPoop && !editPee)) return

        setSavingWalkId(editingWalk.id)
        try {
            await updateWalk(editingWalk, {
                poop: editPoop,
                pee: editPee,
                userName: editUser,
                time: combineDateAndTime(selectedDate, editTime),
            })
            setEditingWalk(null)
        } finally {
            setSavingWalkId(null)
        }
    }

    const handleDeleteWalk = async (walk: Walk) => {
        setDeletingWalkId(walk.id)
        try {
            await deleteWalk(walk)
            if (editingWalk?.id === walk.id) {
                setEditingWalk(null)
            }
        } finally {
            setDeletingWalkId(null)
        }
    }

    const handleRoutineSave = async (status: RoutineStatus, assignedTo: UserName) => {
        if (!user) return

        setSavingRoutine(status.type)
        try {
            if (status.activity) {
                await updateActivity(
                    status.activity.id,
                    user,
                    assignedTo,
                    status.defaultCreatedAt
                )
            } else {
                await logActivity(
                    status.type,
                    user,
                    assignedTo,
                    status.defaultCreatedAt
                )
            }

            setEditingRoutine(null)
        } finally {
            setSavingRoutine(null)
        }
    }

    const handleRoutineDelete = async (status: RoutineStatus) => {
        if (!status.activity) return

        setDeletingRoutine(status.type)
        try {
            await deleteActivity(status.activity.id)
            if (editingRoutine === status.type) {
                setEditingRoutine(null)
            }
        } finally {
            setDeletingRoutine(null)
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousDay}
                            className="px-3"
                        >
                            ← Prev
                        </Button>

                        <div className="text-center flex-1">
                            <p className="font-semibold text-foreground">
                                {fullDateLabel}
                            </p>
                            {isToday && (
                                <span className="text-xs text-primary font-medium">Today</span>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextDay}
                            disabled={isToday}
                            className="px-3"
                        >
                            Next →
                        </Button>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                            <CalendarDays className="h-4 w-4" />
                            Jump to a date
                        </label>
                        <input
                            type="date"
                            value={selectedDateInput}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(event) => handleDateChange(event.target.value)}
                            className="h-11 w-full rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    ⚠️ {error}
                </div>
            )}

            {isLoading && (
                <div className="py-8 text-center">
                    <div className="mb-2 text-4xl animate-spin">🐕</div>
                    <p className="text-muted-foreground">Loading day history...</p>
                </div>
            )}

            {!isLoading && dayStats && (
                <>
                    {!isReadOnly ? null : (
                        <div className="rounded-xl border border-amber-600/25 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                            Unlock editing to fix old walks and routines for this day.
                        </div>
                    )}

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                📊 Day Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-green-400">
                                    <span>🦮</span>
                                    <span className="font-semibold">{dayStats.walksCount}</span>
                                    <span className="opacity-60">walks</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-400">
                                    <span>💩</span>
                                    <span className="font-semibold">{dayStats.poopCount}</span>
                                    <span className="opacity-60">poops</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-blue-400">
                                    <span>💦</span>
                                    <span className="font-semibold">{dayStats.peeCount}</span>
                                    <span className="opacity-60">pees</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {routineStatuses.map((status) => (
                                    <div
                                        key={status.type}
                                        className={`rounded-xl border p-3 ${status.isComplete
                                            ? 'border-emerald-500/30 bg-emerald-500/5'
                                            : 'border-border bg-muted/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{status.icon}</span>
                                                <div>
                                                    <p className="font-medium text-foreground">{status.label}</p>
                                                    <p className="text-xs text-muted-foreground">{status.description}</p>
                                                </div>
                                            </div>

                                            {status.isComplete ? (
                                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                                                    <Check className="h-4 w-4" />
                                                    <span>{status.assignedTo}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Missing</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    🦮 Walks
                                </CardTitle>
                                {!isReadOnly && (
                                    <Button
                                        size="sm"
                                        variant={showAddWalk ? 'outline' : 'secondary'}
                                        onClick={() => setShowAddWalk((open) => !open)}
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        {showAddWalk ? 'Cancel' : 'Add Walk'}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {!isReadOnly && showAddWalk && (
                                <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-foreground">Add walk for {isTodayDate(selectedDate) ? 'today' : format(selectedDate, 'MMM d')}</p>
                                        <span className="text-xs text-muted-foreground">Choose time and what Pepper did</span>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-muted-foreground">Time:</label>
                                            <input
                                                type="time"
                                                value={addTime}
                                                onChange={(event) => setAddTime(event.target.value)}
                                                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {USERS.map((walkUser) => (
                                                <button
                                                    key={walkUser}
                                                    onClick={() => setAddWalker(walkUser)}
                                                    className={`rounded-md px-2 py-1 text-sm transition-all ${addWalker === walkUser
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                        }`}
                                                >
                                                    {userEmojis[walkUser]} {walkUser}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">What she did:</span>
                                        <button
                                            onClick={() => setAddPoop((value) => !value)}
                                            className={`rounded-lg px-3 py-1.5 text-lg transition-all ${addPoop
                                                ? 'bg-amber-500/30 ring-2 ring-amber-500/50'
                                                : 'bg-muted opacity-60 hover:opacity-80'
                                                }`}
                                        >
                                            💩
                                        </button>
                                        <button
                                            onClick={() => setAddPee((value) => !value)}
                                            className={`rounded-lg px-3 py-1.5 text-lg transition-all ${addPee
                                                ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                                                : 'bg-muted opacity-60 hover:opacity-80'
                                                }`}
                                        >
                                            💦
                                        </button>
                                    </div>

                                    <Button
                                        onClick={() => void handleAddWalk()}
                                        disabled={isAddingWalk || (!addPoop && !addPee)}
                                        className="w-full sm:w-auto"
                                    >
                                        {isAddingWalk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Save Walk
                                    </Button>
                                </div>
                            )}

                            {dayStats.walks.length === 0 ? (
                                <p className="py-4 text-center text-muted-foreground">
                                    No walks recorded for this day yet.
                                </p>
                            ) : (
                                dayStats.walks.map((walk) => (
                                    <div key={walk.id}>
                                        {editingWalk?.id === walk.id ? (
                                            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Edit Walk</span>
                                                    <button
                                                        onClick={() => setEditingWalk(null)}
                                                        className="text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-muted-foreground">Time:</label>
                                                    <input
                                                        type="time"
                                                        value={editTime}
                                                        onChange={(event) => setEditTime(event.target.value)}
                                                        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-ring"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-muted-foreground">Walker:</label>
                                                    <div className="flex flex-wrap gap-1">
                                                        {USERS.map((walkUser) => (
                                                            <button
                                                                key={walkUser}
                                                                onClick={() => setEditUser(walkUser)}
                                                                className={`rounded-md px-2 py-1 text-sm transition-all ${editUser === walkUser
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                                    }`}
                                                            >
                                                                {userEmojis[walkUser]} {walkUser}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <label className="text-sm text-muted-foreground">What she did:</label>
                                                    <button
                                                        onClick={() => setEditPoop((value) => !value)}
                                                        className={`rounded-lg px-3 py-1.5 text-lg transition-all ${editPoop
                                                            ? 'bg-amber-500/30 ring-2 ring-amber-500/50'
                                                            : 'bg-muted opacity-60 hover:opacity-80'
                                                            }`}
                                                    >
                                                        💩
                                                    </button>
                                                    <button
                                                        onClick={() => setEditPee((value) => !value)}
                                                        className={`rounded-lg px-3 py-1.5 text-lg transition-all ${editPee
                                                            ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                                                            : 'bg-muted opacity-60 hover:opacity-80'
                                                            }`}
                                                    >
                                                        💦
                                                    </button>
                                                </div>

                                                <div className="flex gap-2 pt-1">
                                                    <Button
                                                        onClick={() => void handleSaveWalk()}
                                                        disabled={savingWalkId === walk.id || (!editPoop && !editPee)}
                                                        className="flex-1"
                                                        size="sm"
                                                    >
                                                        {savingWalkId === walk.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={`group flex items-center justify-between rounded-xl border p-3 transition-all ${userColors[walk.userName]}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="min-w-[70px] text-sm font-mono font-medium text-muted-foreground">
                                                        {walk.timeFormatted}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xl">{userEmojis[walk.userName]}</span>
                                                        <span className="text-sm font-medium text-foreground">
                                                            {walk.userName}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-2xl">
                                                        {walk.hasPoop && <span title="Poop">💩</span>}
                                                        {walk.hasPee && <span title="Pee">💦</span>}
                                                    </div>

                                                    {!isReadOnly && (
                                                        <div className="ml-2 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                                            <button
                                                                onClick={() => handleStartEdit(walk)}
                                                                className="rounded-lg bg-muted/80 p-1.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
                                                                title="Edit walk"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => void handleDeleteWalk(walk)}
                                                                disabled={deletingWalkId === walk.id}
                                                                className="rounded-lg bg-muted/80 p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive disabled:opacity-50"
                                                                title="Delete walk"
                                                            >
                                                                {deletingWalkId === walk.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                🏠 Daily Routines
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {routineStatuses.map((status) => (
                                <div
                                    key={status.type}
                                    className={`rounded-xl border p-4 ${status.isComplete
                                        ? 'border-emerald-500/30 bg-emerald-500/5'
                                        : 'border-border bg-card'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{status.icon}</span>
                                            <div>
                                                <p className="font-medium text-foreground">{status.label}</p>
                                                <p className="text-xs text-muted-foreground">{status.description}</p>
                                                {status.isComplete ? (
                                                    <p className="mt-1 text-sm text-emerald-500">
                                                        Logged for {fullDateLabel} by <strong>{status.assignedTo}</strong>
                                                    </p>
                                                ) : (
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Not logged for this day.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {isReadOnly ? (
                                            <span className="text-sm text-muted-foreground">
                                                {status.isComplete ? 'Done' : 'Missing'}
                                            </span>
                                        ) : editingRoutine === status.type ? (
                                            <div className="flex flex-wrap justify-end gap-1">
                                                {USERS.map((routineUser) => (
                                                    <Button
                                                        key={routineUser}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleRoutineSave(status, routineUser)}
                                                        disabled={savingRoutine === status.type}
                                                        className="bg-background text-xs"
                                                    >
                                                        {savingRoutine === status.type ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            routineUser
                                                        )}
                                                    </Button>
                                                ))}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setEditingRoutine(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={status.isComplete ? 'outline' : 'secondary'}
                                                    onClick={() => setEditingRoutine(status.type)}
                                                >
                                                    {status.isComplete ? 'Change' : 'Log'}
                                                </Button>
                                                {status.activity && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => void handleRoutineDelete(status)}
                                                        disabled={deletingRoutine === status.type}
                                                    >
                                                        {deletingRoutine === status.type ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            'Remove'
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

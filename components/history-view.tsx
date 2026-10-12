'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, isToday as isTodayDate, parseISO, setHours, setMinutes, startOfDay } from 'date-fns'
import { CalendarDays, Check, Loader2, Plus } from 'lucide-react'
import { DeleteConfirmation, isUnchangedWalk } from './delete-confirmation'
import { WalkRow } from './walk-row'
import { walkOutcomeLabel } from '@/lib/domain/metrics'
import { SaveFeedback } from '@/components/save-feedback'
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
        isRefreshing,
        refetch,
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

    const [deleteTarget, setDeleteTarget] = useState<{ walk: Walk } | { routine: RoutineStatus } | null>(null)
    const saving = useRef(false)
    const addDraftId = useRef<string | undefined>(undefined)
    const [saveTarget, setSaveTarget] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [showAddWalk, setShowAddWalk] = useState(false)
    const [addWalker, setAddWalker] = useState<UserName>(user ?? 'Chris')
    const [addTime, setAddTime] = useState(getDefaultWalkTimeValue)
    const [addPoop, setAddPoop] = useState(false)
    const [addPee, setAddPee] = useState(false)
    const [addNeither, setAddNeither] = useState(false)
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

    const mutationPending = Boolean(isAddingWalk || savingWalkId || deletingWalkId || savingRoutine || deletingRoutine)
    const careBusy = isReadOnly || isRefreshing || Boolean(error) || mutationPending

    const routineStatuses = useMemo(() => [toysStatus, dinnerStatus], [toysStatus, dinnerStatus])
    const deleteTargetChanged = Boolean(deleteTarget && ('walk' in deleteTarget
        ? !isUnchangedWalk(deleteTarget.walk, dayStats?.walks.find(walk => walk.id === deleteTarget.walk.id))
        : (() => {
            const current = routineStatuses.find(status => status.type === deleteTarget.routine.type)?.activity
            const original = deleteTarget.routine.activity
            return !current || !original || current.id !== original.id || current.assigned_to !== original.assigned_to || current.created_at !== original.created_at || current.logged_by !== original.logged_by
        })()))
    const selectedDateInput = format(selectedDate, 'yyyy-MM-dd')
    const fullDateLabel = format(selectedDate, 'EEEE, MMMM d, yyyy')

    useEffect(() => {
        setSaveError(null)
        setSaveTarget(null)
        setSaved(false)
        setShowAddWalk(false)
        setAddWalker(user ?? 'Chris')
        setAddTime(getDefaultWalkTimeValue())
        setAddPoop(false)
        setAddPee(false)
        setAddNeither(false)
        setEditingWalk(null)
        setEditingRoutine(null)
        setDeleteTarget(null)
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
        if (!user || isReadOnly || isRefreshing || Boolean(error) || saving.current || !addTime || (!addPoop && !addPee && !addNeither)) return

        saving.current = true
        setSaveTarget('add-walk')
        setSaveError(null)
        setSaved(false)
        setIsAddingWalk(true)
        try {
            await addWalk({
                draftId: addDraftId.current,
                poop: addPoop,
                pee: addPee,
                userName: addWalker,
                createdAt: combineDateAndTime(selectedDate, addTime),
            })

            setShowAddWalk(false)
            setAddTime(getDefaultWalkTimeValue())
            setAddPoop(false)
            setAddPee(false)
            setAddNeither(false)
            setAddWalker(user)
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setIsAddingWalk(false)
        }
    }

    const handleSaveWalk = async () => {
        if (!editingWalk || isReadOnly || isRefreshing || Boolean(error) || saving.current || !editTime) return

        saving.current = true
        setSaveTarget(editingWalk.id)
        setSaveError(null)
        setSaved(false)
        setSavingWalkId(editingWalk.id)
        try {
            await updateWalk(editingWalk, {
                poop: editPoop,
                pee: editPee,
                userName: editUser,
                time: combineDateAndTime(selectedDate, editTime),
            })
            setEditingWalk(null)
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setSavingWalkId(null)
        }
    }

    const handleDeleteWalk = async (walk: Walk) => {
        if (isReadOnly || isRefreshing || Boolean(error) || saving.current) return
        saving.current = true
        setSaveTarget(walk.id)
        setSaveError(null)
        setSaved(false)
        setDeletingWalkId(walk.id)
        try {
            await deleteWalk(walk)
            setDeleteTarget(null)
            if (editingWalk?.id === walk.id) {
                setEditingWalk(null)
            }
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setDeletingWalkId(null)
        }
    }

    const handleRoutineSave = async (status: RoutineStatus, assignedTo: UserName) => {
        if (!user || isReadOnly || isRefreshing || Boolean(error) || saving.current) return

        saving.current = true
        setSaveTarget(status.type)
        setSaveError(null)
        setSaved(false)
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
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setSavingRoutine(null)
        }
    }

    const handleRoutineDelete = async (status: RoutineStatus) => {
        if (!status.activity || isReadOnly || isRefreshing || Boolean(error) || saving.current) return

        saving.current = true
        setSaveTarget(status.type)
        setSaveError(null)
        setSaved(false)
        setDeletingRoutine(status.type)
        try {
            await deleteActivity(status.activity.id)
            setDeleteTarget(null)
            if (editingRoutine === status.type) {
                setEditingRoutine(null)
            }
            setSaved(true)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Unable to save. Please try again. Your input has been kept.')
        } finally {
            saving.current = false
            setDeletingRoutine(null)
        }
    }

    return (
        <div className="space-y-4">
            <DeleteConfirmation
                open={Boolean(deleteTarget)}
                description={deleteTarget ? 'walk' in deleteTarget
                    ? `Walk on ${format(deleteTarget.walk.time, 'MMM d, yyyy')} at ${deleteTarget.walk.timeFormatted} by ${deleteTarget.walk.userName} (${walkOutcomeLabel(deleteTarget.walk)}).`
                    : `${deleteTarget.routine.label} on ${fullDateLabel}, done by ${deleteTarget.routine.assignedTo}.` : ''}
                pending={Boolean(deletingWalkId || deletingRoutine)}
                blocked={careBusy || deleteTargetChanged}
                error={deleteTargetChanged && !deletingWalkId && !deletingRoutine ? 'This record changed or was removed. Cancel and review the current day before removing.' : saveError}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (!deleteTarget || deleteTargetChanged) return
                    if ('walk' in deleteTarget) void handleDeleteWalk(deleteTarget.walk)
                    else void handleRoutineDelete(deleteTarget.routine)
                }}
            />
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={mutationPending}
                            onClick={goToPreviousDay}
                            className="min-h-11 px-3"
                        >
                            ← Prev
                        </Button>

                        <div className="order-first w-full min-w-0 text-center sm:order-none sm:w-auto sm:flex-1">
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
                            disabled={isToday || mutationPending}
                            className="min-h-11 px-3"
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
                            aria-label="History date"
                            disabled={mutationPending}
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
                <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    <p>{error}</p>
                    <Button variant="outline" className="mt-2 min-h-11" disabled={isLoading || isRefreshing} onClick={() => void refetch()}>Refresh history</Button>
                </div>
            )}

            <SaveFeedback error={null} saved={saved} />
            {isRefreshing ? <p role="status" className="text-sm text-muted-foreground">Refreshing history...</p> : null}
            {isLoading && (
                <div className="py-8 text-center">
                    <div className="mb-2 text-4xl animate-spin">🐕</div>
                    <p className="text-muted-foreground">Loading day history...</p>
                </div>
            )}

            {!isLoading && dayStats && (
                <>
                    {!isReadOnly ? null : (
                        <div className="rounded-xl border border-amber-600/25 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
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
                                <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-green-600 dark:text-green-400">
                                    <span>🦮</span>
                                    <span className="font-semibold">{dayStats.walksCount}</span>
                                    <span className="text-foreground">walks</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-600 dark:text-amber-400">
                                    <span>💩</span>
                                    <span className="font-semibold">{dayStats.poopCount}</span>
                                    <span className="text-foreground">poops</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-blue-600 dark:text-blue-400">
                                    <span>💦</span>
                                    <span className="font-semibold">{dayStats.peeCount}</span>
                                    <span className="text-foreground">pees</span>
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
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{status.icon}</span>
                                                <div>
                                                    <p className="font-medium text-foreground">{status.label}</p>
                                                    <p className="text-xs text-muted-foreground">{status.description}</p>
                                                </div>
                                            </div>

                                            {status.isComplete ? (
                                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
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
                                        disabled={careBusy}
                                        onClick={() => { if (!showAddWalk) addDraftId.current = crypto.randomUUID(); setShowAddWalk((open) => !open) }}
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
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium text-foreground">Add walk for {isTodayDate(selectedDate) ? 'today' : format(selectedDate, 'MMM d')}</p>
                                        <span className="text-xs text-muted-foreground">Choose time and what Pepper did</span>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-muted-foreground">Time:</label>
                                            <input
                                                aria-label="Walk time"
                                                disabled={careBusy}
                                                type="time"
                                                value={addTime}
                                                onChange={(event) => setAddTime(event.target.value)}
                                                className="min-h-11 min-w-0 w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {USERS.map((walkUser) => (
                                                <button
                                                    disabled={careBusy}
                                                    key={walkUser}
                                                    aria-pressed={addWalker === walkUser}
                                                    onClick={() => setAddWalker(walkUser)}
                                                    className={`min-h-11 min-w-11 rounded-md px-3 py-2 text-sm transition-all ${addWalker === walkUser
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
                                                        }`}
                                                >
                                                    {userEmojis[walkUser]} {walkUser}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-sm text-muted-foreground">What she did:</span>
                                        <button
                                            disabled={careBusy}
                                            aria-label="Poop" aria-pressed={addPoop}
                                            onClick={() => { setAddPoop((value) => !value); setAddNeither(false) }}
                                            className={`min-h-11 min-w-11 rounded-lg px-3 py-2 text-lg transition-all ${addPoop
                                                ? 'bg-amber-500/30 ring-2 ring-amber-500/50'
                                                : 'bg-muted opacity-60 hover:opacity-80'
                                                }`}
                                        >
                                            💩
                                        </button>
                                        <button
                                            disabled={careBusy}
                                            aria-label="Pee" aria-pressed={addPee}
                                            onClick={() => { setAddPee((value) => !value); setAddNeither(false) }}
                                            className={`min-h-11 min-w-11 rounded-lg px-3 py-2 text-lg transition-all ${addPee
                                                ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                                                : 'bg-muted opacity-60 hover:opacity-80'
                                                }`}
                                        >
                                            💦
                                        </button>
                                    </div>

                                    <Button variant="outline" disabled={careBusy} aria-pressed={addNeither} onClick={() => { setAddNeither(true); setAddPoop(false); setAddPee(false) }}>Neither</Button>
                                    <Button
                                        onClick={() => void handleAddWalk()}
                                        disabled={careBusy || !addTime || (!addPoop && !addPee && !addNeither)}
                                        className="min-h-11 w-full sm:w-auto"
                                    >
                                        {isAddingWalk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Save Walk
                                    </Button>
                                </div>
                            )}

                            <SaveFeedback error={saveTarget === 'add-walk' ? saveError : null} />
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
                                                        disabled={mutationPending}
                                                        aria-label="Cancel editing walk"
                                                        onClick={() => setEditingWalk(null)}
                                                        className="min-h-11 min-w-11 text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <label className="text-sm text-muted-foreground">Time:</label>
                                                    <input
                                                        aria-label="Walk time"
                                                        disabled={careBusy}
                                                        type="time"
                                                        value={editTime}
                                                        onChange={(event) => setEditTime(event.target.value)}
                                                        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-ring"
                                                    />
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <label className="text-sm text-muted-foreground">Walker:</label>
                                                    <div className="flex flex-wrap gap-1">
                                                        {USERS.map((walkUser) => (
                                                            <button
                                                                disabled={careBusy}
                                                                key={walkUser}
                                                                aria-pressed={editUser === walkUser}
                                                                onClick={() => setEditUser(walkUser)}
                                                                className={`min-h-11 min-w-11 rounded-md px-3 py-2 text-sm transition-all ${editUser === walkUser
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
                                                                    }`}
                                                            >
                                                                {userEmojis[walkUser]} {walkUser}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    <label className="text-sm text-muted-foreground">What she did:</label>
                                                    <button
                                                        disabled={careBusy}
                                                        aria-label="Poop" aria-pressed={editPoop}
                                                        onClick={() => setEditPoop((value) => !value)}
                                                        className={`min-h-11 min-w-11 rounded-lg px-3 py-2 text-lg transition-all ${editPoop
                                                            ? 'bg-amber-500/30 ring-2 ring-amber-500/50'
                                                            : 'bg-muted opacity-60 hover:opacity-80'
                                                            }`}
                                                    >
                                                        💩
                                                    </button>
                                                    <button
                                                        disabled={careBusy}
                                                        aria-label="Pee" aria-pressed={editPee}
                                                        onClick={() => setEditPee((value) => !value)}
                                                        className={`min-h-11 min-w-11 rounded-lg px-3 py-2 text-lg transition-all ${editPee
                                                            ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                                                            : 'bg-muted opacity-60 hover:opacity-80'
                                                            }`}
                                                    >
                                                        💦
                                                    </button>
                                                </div>

                                                <Button variant="outline" disabled={careBusy} aria-pressed={!editPoop && !editPee} onClick={() => { setEditPoop(false); setEditPee(false) }}>Neither</Button>
                                                <div className="flex gap-2 pt-1">
                                                    <Button
                                                        onClick={() => void handleSaveWalk()}
                                                        disabled={careBusy || !editTime}
                                                        className="flex-1"
                                                        size="sm"
                                                    >
                                                        {savingWalkId === walk.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        Save Changes
                                                    </Button>
                                                </div>
                                                <div className="border-t border-border/60 pt-3">
                                                    <Button
                                                        variant="destructive"
                                                        disabled={careBusy}
                                                        onClick={() => { setSaveError(null); setDeleteTarget({ walk }) }}
                                                    >
                                                        {deletingWalkId === walk.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        Delete walk
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <WalkRow
                                                walk={walk}
                                                action={isReadOnly ? null : (
                                                    <Button
                                                        variant="outline"
                                                        aria-label={`Edit ${walk.timeFormatted} walk by ${walk.userName}`}
                                                        disabled={careBusy}
                                                        onClick={() => handleStartEdit(walk)}
                                                        className="shrink-0"
                                                    >
                                                        Edit
                                                    </Button>
                                                )}
                                            />
                                        )}
                                        <SaveFeedback error={saveTarget === walk.id ? saveError : null} />
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
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{status.icon}</span>
                                            <div>
                                                <p className="font-medium text-foreground">{status.label}</p>
                                                <p className="text-xs text-muted-foreground">{status.description}</p>
                                                {status.isComplete ? (
                                                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
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
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {USERS.map((routineUser) => (
                                                    <Button
                                                        key={routineUser}
                                                        aria-label={routineUser}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleRoutineSave(status, routineUser)}
                                                        disabled={careBusy}
                                                        className="bg-background text-sm"
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
                                                    disabled={mutationPending}
                                                    onClick={() => setEditingRoutine(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-2">
                                                {!status.isComplete ? <Button size="sm" variant="secondary" disabled={careBusy || !user} onClick={() => { if (user) void handleRoutineSave(status, user) }}>Done by {user}</Button> : null}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={careBusy}
                                                    aria-expanded={editingRoutine === status.type}
                                                    onClick={() => setEditingRoutine(status.type)}
                                                >
                                                    {status.isComplete ? 'Change' : 'Someone else'}
                                                </Button>
                                                {status.activity && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => { setSaveError(null); setDeleteTarget({ routine: status }) }}
                                                        disabled={careBusy}
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
                                    <SaveFeedback error={saveTarget === status.type ? saveError : null} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

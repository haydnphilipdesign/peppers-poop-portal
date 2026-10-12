'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteConfirmation, isUnchangedWalk } from './delete-confirmation'
import { walkOutcomeLabel } from '@/lib/domain/metrics'
import { SaveFeedback } from '@/components/save-feedback'
import { Button } from '@/components/ui/button'
import { useReadOnly } from '@/lib/read-only-context'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'

interface WalkHistoryProps {
    walks: Walk[]
    onDeleteWalk: (walk: Walk) => Promise<void>
    onUpdateWalk: (walk: Walk, updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }) => Promise<void>
    isLoading?: boolean
    unavailable?: boolean
    updatesBlocked?: boolean
}

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

const users: UserName[] = ['Chris', 'Debbie', 'Haydn']

export function WalkHistory({
    walks,
    onDeleteWalk,
    onUpdateWalk,
    isLoading = false,
    unavailable = false,
    updatesBlocked = false,
}: WalkHistoryProps) {
    const isReadOnly = useReadOnly()
    const saving = useRef(false)
    const [deleteTarget, setDeleteTarget] = useState<Walk | null>(null)
    const [saved, setSaved] = useState(false)
    const [editingWalk, setEditingWalk] = useState<Walk | null>(null)
    const [editPoop, setEditPoop] = useState(false)
    const [editPee, setEditPee] = useState(false)
    const [editUser, setEditUser] = useState<UserName>('Chris')
    const [editTime, setEditTime] = useState('')
    const [deletingWalkId, setDeletingWalkId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleStartEdit = (walk: Walk) => {
        setEditingWalk(walk)
        setError(null)
        setEditPoop(walk.hasPoop)
        setEditPee(walk.hasPee)
        setEditUser(walk.userName)
        // Format time for input (HH:MM)
        const hours = walk.time.getHours().toString().padStart(2, '0')
        const minutes = walk.time.getMinutes().toString().padStart(2, '0')
        setEditTime(`${hours}:${minutes}`)
    }

    const handleSaveEdit = async () => {
        if (!editingWalk || isReadOnly || updatesBlocked || saving.current) return

        const [hours, minutes] = editTime.split(':').map(Number)
        const newTime = new Date(editingWalk.time)
        newTime.setHours(hours, minutes, 0, 0)

        saving.current = true
        setSaved(false)
        setIsSaving(true)
        setError(null)
        try {
            await onUpdateWalk(editingWalk, {
                poop: editPoop, pee: editPee, userName: editUser, time: newTime,
            })
            setEditingWalk(null)
            setSaved(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update the walk. Please try again.')
        } finally {
            saving.current = false
            setIsSaving(false)
        }
    }

    const handleDelete = async (walk: Walk) => {
        if (isReadOnly || updatesBlocked || saving.current || !isUnchangedWalk(walk, walks.find(current => current.id === walk.id))) return
        saving.current = true
        setSaved(false)
        setDeletingWalkId(walk.id)
        setError(null)
        try {
            await onDeleteWalk(walk)
            setDeleteTarget(null)
            setSaved(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete the walk. Please try again.')
        } finally {
            saving.current = false
            setDeletingWalkId(null)
        }
    }

    const targetChanged = Boolean(deleteTarget && !isUnchangedWalk(deleteTarget, walks.find(current => current.id === deleteTarget.id)))
    const deleteConfirmation = (
        <DeleteConfirmation
            open={Boolean(deleteTarget)}
            description={deleteTarget ? `Walk on ${deleteTarget.time.toLocaleDateString()} at ${deleteTarget.timeFormatted} by ${deleteTarget.userName} (${walkOutcomeLabel(deleteTarget)}).` : ''}
            pending={Boolean(deletingWalkId)}
            blocked={isReadOnly || updatesBlocked || targetChanged}
            error={targetChanged && !deletingWalkId ? 'This walk changed or was removed. Cancel and review the current walk log before removing.' : error}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget) }}
        />
    )

    if (isLoading || unavailable || walks.length === 0) {
        return (
            <Card className="min-h-44" aria-busy={isLoading}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        🦮 Today&apos;s Walk Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {deleteConfirmation}
                    <SaveFeedback error={error} saved={saved} />
                    {isLoading ? (
                        <div role="status" className="py-4">
                            <span className="sr-only">Loading today&apos;s walk log...</span>
                            <div aria-hidden="true" className="h-11 rounded-xl bg-muted motion-safe:animate-pulse" />
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            {unavailable ? 'Today’s walk log could not be loaded.' : 'No walks logged today yet.'}
                        </p>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="min-h-44">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    🦮 Today&apos;s Walk Log
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {deleteConfirmation}
                <SaveFeedback error={error} saved={saved} />
                {walks.map((walk) => (
                    <div key={walk.id}>
                        {editingWalk?.id === walk.id ? (
                            // Edit mode
                            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Edit Walk</span>
                                    <button
                                        aria-label="Cancel editing walk"
                                        disabled={updatesBlocked || isReadOnly || isSaving}
                                        onClick={() => setEditingWalk(null)}
                                        className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Time picker */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Time:</label>
                                    <input
                                        type="time"
                                        aria-label="Walk time"
                                        disabled={updatesBlocked || isReadOnly || isSaving}
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="min-h-11 px-3 py-2 rounded-md border border-input bg-background text-foreground text-base focus:ring-2 focus:ring-ring"
                                    />
                                </div>

                                {/* User selector */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Walker:</label>
                                    <div className="flex flex-wrap gap-1">
                                        {users.map(user => (
                                            <button
                                                aria-pressed={editUser === user}
                                                disabled={updatesBlocked || isReadOnly || isSaving}
                                                key={user}
                                                onClick={() => setEditUser(user)}
                                                className={`min-h-11 min-w-11 px-3 py-2 rounded-md text-sm transition-all ${editUser === user
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
                                                    }`}
                                            >
                                                {userEmojis[user]} {user}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Poop/Pee toggles */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="text-sm text-muted-foreground">What she did:</label>
                                    <button
                                        aria-label="Poop"
                                        aria-pressed={editPoop}
                                        disabled={updatesBlocked || isReadOnly || isSaving}
                                        onClick={() => setEditPoop(!editPoop)}
                                        className={`min-h-11 min-w-11 px-3 py-2 rounded-lg text-lg transition-all ${editPoop
                                            ? 'bg-amber-500/30 shadow-md scale-105 ring-2 ring-amber-500/50'
                                            : 'bg-muted opacity-50 hover:opacity-75'
                                            }`}
                                    >
                                        💩
                                    </button>
                                    <button
                                        aria-label="Pee"
                                        aria-pressed={editPee}
                                        disabled={updatesBlocked || isReadOnly || isSaving}
                                        onClick={() => setEditPee(!editPee)}
                                        className={`min-h-11 min-w-11 px-3 py-2 rounded-lg text-lg transition-all ${editPee
                                            ? 'bg-blue-500/30 shadow-md scale-105 ring-2 ring-blue-500/50'
                                            : 'bg-muted opacity-50 hover:opacity-75'
                                            }`}
                                    >
                                        💦
                                    </button>
                                </div>

                                <Button variant="outline" disabled={updatesBlocked || isReadOnly || isSaving} aria-pressed={!editPoop && !editPee} onClick={() => { setEditPoop(false); setEditPee(false) }}>Neither</Button>
                                {/* Save button */}
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        onClick={handleSaveEdit}
                                        disabled={updatesBlocked || isReadOnly || isSaving || !editTime}
                                        className="min-h-11 flex-1"
                                        size="sm"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // View mode
                            <div
                                className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border ${userColors[walk.userName]}`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Time */}
                                    <span className="text-sm font-mono font-medium text-foreground min-w-[70px]">
                                        {walk.timeFormatted}
                                    </span>

                                    {/* User */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xl">{userEmojis[walk.userName]}</span>
                                        <span className="text-sm font-medium text-foreground">
                                            {walk.userName}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* What Pepper did */}
                                    <div className="flex flex-wrap items-center gap-1 text-2xl">
                                        {walk.hasPoop && <span title="Poop">💩</span>}
                                        {walk.hasPee && <span title="Pee">💦</span>}
                                        {!walk.hasPoop && !walk.hasPee && <span className="text-sm">Neither</span>}
                                    </div>

                                    {/* Keep editing controls visible for touch and keyboard users. */}
                                    {!isReadOnly && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                aria-label={`Edit ${walk.timeFormatted} walk by ${walk.userName}`}
                                                disabled={updatesBlocked || isReadOnly || isSaving || Boolean(deletingWalkId)}
                                                onClick={() => handleStartEdit(walk)}
                                                className="min-h-11 min-w-11 p-2 rounded-lg bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-colors"
                                                title="Edit walk"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                aria-label={`Delete ${walk.timeFormatted} walk by ${walk.userName}`}
                                                onClick={() => { setError(null); setDeleteTarget(walk) }}
                                                disabled={updatesBlocked || isReadOnly || isSaving || Boolean(deletingWalkId)}
                                                className="min-h-11 min-w-11 p-2 rounded-lg bg-muted/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                                title="Delete walk"
                                            >
                                                {deletingWalkId === walk.id ? '⏳' : '🗑️'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

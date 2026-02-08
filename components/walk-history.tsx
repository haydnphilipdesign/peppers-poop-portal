'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useReadOnly } from '@/lib/read-only-context'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'

interface WalkHistoryProps {
    walks: Walk[]
    poopCount: number
    peeCount: number
    walksCount: number
    poopGoal?: number
    walksGoal?: number
    onDeleteWalk: (walk: Walk) => Promise<void>
    onUpdateWalk: (walk: Walk, updates: { poop: boolean; pee: boolean; userName: UserName; time: Date }) => Promise<void>
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

interface WalkStatsBarProps {
    poopCount: number
    peeCount: number
    walksCount: number
    poopGoal: number
    walksGoal: number
}

function WalkStatsBar({
    poopCount,
    peeCount,
    walksCount,
    poopGoal,
    walksGoal,
}: WalkStatsBarProps) {
    const poopGoalReached = poopCount >= poopGoal
    const walksGoalReached = walksCount >= walksGoal

    return (
        <div className="flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${walksGoalReached ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                <span>🦮</span>
                <span className="font-semibold">{walksCount}</span>
                <span className="opacity-60">/{walksGoal}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${poopGoalReached ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                <span>💩</span>
                <span className="font-semibold">{poopCount}</span>
                <span className="opacity-60">/{poopGoal}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                <span>💦</span>
                <span className="font-semibold">{peeCount}</span>
            </div>
        </div>
    )
}

export function WalkHistory({
    walks,
    poopCount,
    peeCount,
    walksCount,
    poopGoal = 3,
    walksGoal = 5,
    onDeleteWalk,
    onUpdateWalk
}: WalkHistoryProps) {
    const isReadOnly = useReadOnly()
    const [editingWalk, setEditingWalk] = useState<Walk | null>(null)
    const [editPoop, setEditPoop] = useState(false)
    const [editPee, setEditPee] = useState(false)
    const [editUser, setEditUser] = useState<UserName>('Chris')
    const [editTime, setEditTime] = useState('')
    const [deletingWalkId, setDeletingWalkId] = useState<string | null>(null)

    const handleStartEdit = (walk: Walk) => {
        setEditingWalk(walk)
        setEditPoop(walk.hasPoop)
        setEditPee(walk.hasPee)
        setEditUser(walk.userName)
        // Format time for input (HH:MM)
        const hours = walk.time.getHours().toString().padStart(2, '0')
        const minutes = walk.time.getMinutes().toString().padStart(2, '0')
        setEditTime(`${hours}:${minutes}`)
    }

    const handleSaveEdit = async () => {
        if (!editingWalk || (!editPoop && !editPee)) return

        const [hours, minutes] = editTime.split(':').map(Number)
        const newTime = new Date(editingWalk.time)
        newTime.setHours(hours, minutes, 0, 0)

        await onUpdateWalk(editingWalk, {
            poop: editPoop,
            pee: editPee,
            userName: editUser,
            time: newTime
        })
        setEditingWalk(null)
    }

    const handleDelete = async (walk: Walk) => {
        setDeletingWalkId(walk.id)
        await onDeleteWalk(walk)
        setDeletingWalkId(null)
    }

    if (walks.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            🦮 Today&apos;s Walk Log
                        </CardTitle>
                        <WalkStatsBar
                            poopCount={poopCount}
                            peeCount={peeCount}
                            walksCount={walksCount}
                            poopGoal={poopGoal}
                            walksGoal={walksGoal}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">
                        No walks yet today. Time to take Pepper out! 🐕
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        🦮 Today&apos;s Walk Log
                    </CardTitle>
                    <WalkStatsBar
                        poopCount={poopCount}
                        peeCount={peeCount}
                        walksCount={walksCount}
                        poopGoal={poopGoal}
                        walksGoal={walksGoal}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {walks.map((walk) => (
                    <div key={walk.id}>
                        {editingWalk?.id === walk.id ? (
                            // Edit mode
                            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Edit Walk</span>
                                    <button
                                        onClick={() => setEditingWalk(null)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Time picker */}
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Time:</label>
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="px-2 py-1 rounded-md border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring"
                                    />
                                </div>

                                {/* User selector */}
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Walker:</label>
                                    <div className="flex gap-1">
                                        {users.map(user => (
                                            <button
                                                key={user}
                                                onClick={() => setEditUser(user)}
                                                className={`px-2 py-1 rounded-md text-sm transition-all ${editUser === user
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                    }`}
                                            >
                                                {userEmojis[user]} {user}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Poop/Pee toggles */}
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-muted-foreground">What she did:</label>
                                    <button
                                        onClick={() => setEditPoop(!editPoop)}
                                        className={`px-3 py-1.5 rounded-lg text-lg transition-all ${editPoop
                                            ? 'bg-amber-500/30 shadow-md scale-105 ring-2 ring-amber-500/50'
                                            : 'bg-muted opacity-50 hover:opacity-75'
                                            }`}
                                    >
                                        💩
                                    </button>
                                    <button
                                        onClick={() => setEditPee(!editPee)}
                                        className={`px-3 py-1.5 rounded-lg text-lg transition-all ${editPee
                                            ? 'bg-blue-500/30 shadow-md scale-105 ring-2 ring-blue-500/50'
                                            : 'bg-muted opacity-50 hover:opacity-75'
                                            }`}
                                    >
                                        💦
                                    </button>
                                </div>

                                {/* Save button */}
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        onClick={handleSaveEdit}
                                        disabled={!editPoop && !editPee}
                                        className="flex-1"
                                        size="sm"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // View mode
                            <div
                                className={`flex items-center justify-between p-3 rounded-xl border ${userColors[walk.userName]} transition-all hover:scale-[1.01] group`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Time */}
                                    <span className="text-sm font-mono font-medium text-muted-foreground min-w-[70px]">
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
                                    <div className="flex items-center gap-1 text-2xl">
                                        {walk.hasPoop && <span title="Poop">💩</span>}
                                        {walk.hasPee && <span title="Pee">💦</span>}
                                    </div>

                                    {/* Edit/Delete buttons - visible on hover, hidden in read-only mode */}
                                    {!isReadOnly && (
                                        <div className="ml-2 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                            <button
                                                onClick={() => handleStartEdit(walk)}
                                                className="p-1.5 rounded-lg bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-colors"
                                                title="Edit walk"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(walk)}
                                                disabled={deletingWalkId === walk.id}
                                                className="p-1.5 rounded-lg bg-muted/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
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

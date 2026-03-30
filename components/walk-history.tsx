'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FamilyAvatar } from '@/components/family-avatar'
import { useReadOnly } from '@/lib/read-only-context'
import { FAMILY_ORDER, getFamilyMemberMeta } from '@/lib/family'
import type { Walk } from '@/hooks/use-logs'
import type { UserName } from '@/lib/database.types'
import { Clock3, Droplets, Footprints, PawPrint, PencilLine, Trash2, X } from 'lucide-react'

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

interface WalkStatsBarProps {
    poopCount: number
    peeCount: number
    walksCount: number
    poopGoal: number
    walksGoal: number
}

function StatChip({
    label,
    value,
    icon,
    accentClassName,
}: {
    label: string
    value: string
    icon: React.ReactNode
    accentClassName: string
}) {
    return (
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${accentClassName}`}>
            <span className="opacity-80">{icon}</span>
            <span className="font-semibold">{value}</span>
            <span className="text-xs uppercase tracking-[0.12em] opacity-70">{label}</span>
        </div>
    )
}

function OutcomePill({ label, emoji }: { label: string; emoji: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
            <span aria-hidden="true">{emoji}</span>
            {label}
        </span>
    )
}

function WalkStatsBar({
    poopCount,
    peeCount,
    walksCount,
    poopGoal,
    walksGoal,
}: WalkStatsBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <StatChip
                label="Walks"
                value={`${walksCount}/${walksGoal}`}
                icon={<Footprints className="h-4 w-4" />}
                accentClassName={walksCount >= walksGoal ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}
            />
            <StatChip
                label="Poops"
                value={`${poopCount}/${poopGoal}`}
                icon={<span aria-hidden="true">💩</span>}
                accentClassName={poopCount >= poopGoal ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}
            />
            <StatChip
                label="Pees"
                value={`${peeCount}`}
                icon={<Droplets className="h-4 w-4" />}
                accentClassName="bg-sky-100 text-sky-800"
            />
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
    onUpdateWalk,
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
            time: newTime,
        })
        setEditingWalk(null)
    }

    const handleDelete = async (walk: Walk) => {
        setDeletingWalkId(walk.id)
        await onDeleteWalk(walk)
        setDeletingWalkId(null)
    }

    return (
        <Card className="rounded-[1.8rem] border-border/80 bg-white/80 shadow-[0_22px_50px_-40px_rgba(70,39,16,0.38)]">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Today&apos;s log</p>
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                            <div className="rounded-full bg-amber-100 p-2 text-amber-900">
                                <PawPrint className="h-4 w-4" />
                            </div>
                            Walk history
                        </CardTitle>
                    </div>
                    <WalkStatsBar
                        poopCount={poopCount}
                        peeCount={peeCount}
                        walksCount={walksCount}
                        poopGoal={poopGoal}
                        walksGoal={walksGoal}
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {walks.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-amber-200 bg-amber-50/55 px-4 py-7 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-900 shadow-sm">
                            <Footprints className="h-5 w-5" />
                        </div>
                        <p className="mt-3 font-medium text-stone-900">No walks logged yet today</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            The first walk will show up here as soon as someone logs it.
                        </p>
                    </div>
                ) : (
                    walks.map((walk) => {
                        const member = getFamilyMemberMeta(walk.userName)

                        return (
                            <div key={walk.id}>
                                {editingWalk?.id === walk.id ? (
                                    <div className="space-y-4 rounded-[1.5rem] border border-amber-200 bg-amber-50/65 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.22em] text-amber-900/70">
                                                    Editing walk
                                                </p>
                                                <p className="mt-1 text-sm text-stone-700">
                                                    Update the time, the walker, and what Pepper did.
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setEditingWalk(null)}
                                                className="rounded-full"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-[minmax(0,190px)_1fr]">
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    Time
                                                </span>
                                                <input
                                                    type="time"
                                                    value={editTime}
                                                    onChange={(e) => setEditTime(e.target.value)}
                                                    className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                />
                                            </label>

                                            <div className="space-y-2">
                                                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    Walker
                                                </span>
                                                <div className="grid gap-2 sm:grid-cols-3">
                                                    {FAMILY_ORDER.map((user) => (
                                                        <button
                                                            key={user}
                                                            onClick={() => setEditUser(user)}
                                                            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                                                                editUser === user
                                                                    ? 'border-stone-900 bg-stone-900 text-white'
                                                                    : 'border-border bg-white text-foreground hover:bg-stone-50'
                                                            }`}
                                                        >
                                                            <FamilyAvatar userName={user} size="sm" />
                                                            <span className="text-sm font-medium">{user}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                Outcomes
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setEditPoop(!editPoop)}
                                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                                        editPoop
                                                            ? 'bg-amber-500 text-white shadow-sm'
                                                            : 'bg-white text-stone-700 ring-1 ring-border'
                                                    }`}
                                                >
                                                    <span aria-hidden="true">💩</span>
                                                    Poop
                                                </button>
                                                <button
                                                    onClick={() => setEditPee(!editPee)}
                                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                                        editPee
                                                            ? 'bg-sky-500 text-white shadow-sm'
                                                            : 'bg-white text-stone-700 ring-1 ring-border'
                                                    }`}
                                                >
                                                    <span aria-hidden="true">💦</span>
                                                    Pee
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSaveEdit}
                                            disabled={!editPoop && !editPee}
                                            className="h-11 rounded-2xl"
                                        >
                                            Save changes
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={`rounded-[1.5rem] border p-4 shadow-sm ${member.surfaceClassName}`}>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                                                        {walk.timeFormatted}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <FamilyAvatar userName={walk.userName} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">{walk.userName}</p>
                                                        <p className="text-xs text-muted-foreground">Logged a walk for Pepper</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {walk.hasPoop ? <OutcomePill emoji="💩" label="Poop" /> : null}
                                                {walk.hasPee ? <OutcomePill emoji="💦" label="Pee" /> : null}

                                                {!isReadOnly ? (
                                                    <div className="ml-auto flex items-center gap-1 sm:ml-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => handleStartEdit(walk)}
                                                            className="rounded-full bg-white/70"
                                                        >
                                                            <PencilLine className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => void handleDelete(walk)}
                                                            disabled={deletingWalkId === walk.id}
                                                            className="rounded-full bg-white/70 text-destructive hover:bg-red-50 hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}

'use client'

import { useUser } from '@/lib/user-context'
import type { UserName } from '@/lib/database.types'

const profiles: { name: UserName; tone: string; emoji: string }[] = [
    { name: 'Chris', tone: 'from-sky-100 to-blue-100 border-sky-200', emoji: '👨' },
    { name: 'Debbie', tone: 'from-rose-100 to-amber-100 border-rose-200', emoji: '👩' },
    { name: 'Haydn', tone: 'from-emerald-100 to-teal-100 border-emerald-200', emoji: '🧑' },
]

export function ProfileSelector() {
    const { setUser } = useUser()

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#fce8d2,transparent_50%),radial-gradient(circle_at_bottom_left,#f8dfd3,transparent_45%),hsl(var(--background))] px-4">
            <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center">
                <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Pepper&apos;s Portal
                    </p>
                    <h1 className="mt-3 text-5xl font-semibold leading-none">Who&apos;s on dog duty?</h1>
                    <p className="mt-4 text-base text-muted-foreground">
                        Choose your profile to open the family dashboard.
                    </p>
                </div>

                <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
                    {profiles.map((profile) => (
                        <button
                            key={profile.name}
                            onClick={() => setUser(profile.name)}
                            className={`group rounded-2xl border bg-gradient-to-br ${profile.tone} p-5 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-4xl">{profile.emoji}</span>
                                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    Enter
                                </span>
                            </div>
                            <p className="mt-5 text-2xl font-semibold">{profile.name}</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Open walk logs, routines, and schedule.
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

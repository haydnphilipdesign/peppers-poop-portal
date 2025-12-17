'use client'

import { useUser } from '@/lib/user-context'
import type { UserName } from '@/lib/database.types'

const profiles: { name: UserName; color: string; emoji: string }[] = [
    { name: 'Chris', color: 'from-blue-500 to-blue-700', emoji: '👨' },
    { name: 'Debbie', color: 'from-pink-500 to-rose-600', emoji: '👩' },
    { name: 'Haydn', color: 'from-emerald-500 to-teal-600', emoji: '🧑' },
]

export function ProfileSelector() {
    const { setUser } = useUser()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-zinc-900 dark:via-stone-900 dark:to-neutral-900 px-4">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="text-6xl mb-4">🐕</div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    Pepper&apos;s Portal
                </h1>
                <p className="text-lg text-stone-600 dark:text-stone-400 mt-2">
                    Who&apos;s helping Pepper today?
                </p>
            </div>

            {/* Profile Grid */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                {profiles.map((profile) => (
                    <button
                        key={profile.name}
                        onClick={() => setUser(profile.name)}
                        className="group flex flex-col items-center gap-3 transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 rounded-3xl p-4"
                    >
                        {/* Avatar */}
                        <div
                            className={`w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br ${profile.color} flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow duration-200 ring-4 ring-white/50 dark:ring-white/20`}
                        >
                            <span className="text-5xl md:text-6xl">{profile.emoji}</span>
                        </div>
                        {/* Name */}
                        <span className="text-xl md:text-2xl font-semibold text-stone-800 dark:text-stone-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {profile.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <p className="mt-16 text-sm text-stone-500 dark:text-stone-500">
                Tap your profile to get started
            </p>
        </div>
    )
}

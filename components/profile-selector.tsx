'use client'

import { FamilyAvatar } from '@/components/family-avatar'
import { FAMILY_ORDER, getFamilyMemberMeta } from '@/lib/family'
import { useUser } from '@/lib/user-context'
import type { UserName } from '@/lib/database.types'
import { ChevronRight, ShieldCheck } from 'lucide-react'

export function ProfileSelector() {
    const { setUser } = useUser()

    return (
        <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,hsl(32_92%_90%),transparent_42%),radial-gradient(circle_at_bottom_left,hsl(16_74%_90%),transparent_36%),linear-gradient(180deg,hsl(34_45%_97%),hsl(var(--background))_38%)] px-4 py-8">
            <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col justify-center">
                <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_30px_90px_-48px_rgba(130,74,25,0.45)] backdrop-blur sm:p-8">
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                            Pepper&apos;s Portal
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold leading-none text-balance sm:text-5xl">
                            Who&apos;s on dog duty?
                        </h1>
                        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
                            Pick your name to jump into today&apos;s walks, routines, and reminders.
                        </p>
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/80 px-4 py-2 text-sm text-amber-900/80">
                        <ShieldCheck className="h-4 w-4" />
                        Built for quick check-ins on the family&apos;s phones
                    </div>

                    <div className="mt-8 grid w-full gap-3">
                        {FAMILY_ORDER.map((profile: UserName) => {
                            const member = getFamilyMemberMeta(profile)

                            return (
                                <button
                                    key={profile}
                                    onClick={() => setUser(profile)}
                                    className={`group flex w-full items-center justify-between rounded-[1.65rem] border px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${member.surfaceClassName}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <FamilyAvatar userName={profile} size="lg" />
                                        <div>
                                            <p className="text-lg font-semibold text-foreground">{profile}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Open the family dashboard
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm font-medium text-amber-900/70">
                                        <span className="hidden sm:inline">Enter</span>
                                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Fast to open, easy to tap, and shared by Chris, Debbie, and Haydn.
                    </p>
                </div>
            </div>
        </div>
    )
}

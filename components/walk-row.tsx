import type { ReactNode } from 'react'
import type { UserName } from '@/lib/database.types'
import type { Walk } from '@/lib/domain/metrics'

const userEmojis: Record<UserName, string> = {
    Chris: '👨',
    Debbie: '👩',
    Haydn: '🧑',
}

// A slim accent hints at the walker; the name beside it is the identifier.
const userAccents: Record<UserName, string> = {
    Chris: 'border-l-blue-500/70',
    Debbie: 'border-l-pink-500/70',
    Haydn: 'border-l-emerald-500/70',
}

/** One walk on two lines: when and who, then what Pepper did in words. */
export function WalkRow({ walk, action }: { walk: Walk; action?: ReactNode }) {
    return (
        <div className={`flex min-h-14 items-center justify-between gap-2 rounded-lg border-l-4 bg-muted/40 py-2 pl-3 pr-2 ${userAccents[walk.userName]}`}>
            <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2 text-base">
                    <span className="font-semibold tabular-nums">{walk.timeFormatted}</span>
                    <span><span aria-hidden="true">{userEmojis[walk.userName]}</span> {walk.userName}</span>
                </p>
                <p className="flex flex-wrap gap-x-3 text-sm text-foreground/85">
                    {walk.hasPoop ? <span><span aria-hidden="true">💩</span> Poop</span> : null}
                    {walk.hasPee ? <span><span aria-hidden="true">💦</span> Pee</span> : null}
                    {!walk.hasPoop && !walk.hasPee ? <span>Neither</span> : null}
                </p>
            </div>
            {action}
        </div>
    )
}

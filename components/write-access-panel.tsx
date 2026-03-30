'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

interface WriteAccessPanelProps {
    onUnlock: (pin: string) => Promise<boolean>
    isLoading: boolean
    error: string | null
}

export function WriteAccessPanel({
    onUnlock,
    isLoading,
    error,
}: WriteAccessPanelProps) {
    const [pin, setPin] = useState('')

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const success = await onUnlock(pin.trim())
        if (success) {
            setPin('')
        }
    }

    return (
        <section className="rounded-[1.75rem] border border-amber-300/70 bg-[linear-gradient(135deg,hsl(38_90%_96%),hsl(28_88%_93%))] p-5 text-stone-900 shadow-[0_26px_60px_-44px_rgba(133,78,14,0.55)]">
            <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-stone-900 p-2.5 text-amber-50 shadow-sm">
                    <LockKeyhole className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-900/75">
                        Editing locked
                    </p>
                    <h2 className="text-xl font-semibold leading-tight text-balance">
                        Unlock logging and updates when you&apos;re ready
                    </h2>
                    <p className="text-sm leading-6 text-stone-700">
                        Everyone can still view the dashboard. Enter the family PIN to turn on walk logging,
                        routine updates, and reminder actions.
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-sm text-stone-700">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Read-only mode stays available until editing is unlocked.
            </div>

            <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
                <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    className="h-12 flex-1 rounded-2xl border border-amber-900/15 bg-white px-4 text-base outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Family PIN"
                    aria-label="Family PIN"
                    disabled={isLoading}
                />
                <Button
                    type="submit"
                    className="h-12 rounded-2xl bg-stone-900 px-5 text-sm text-amber-50 hover:bg-stone-800"
                    disabled={isLoading || pin.trim().length < 4}
                >
                    {isLoading ? 'Checking…' : 'Unlock editing'}
                </Button>
            </form>

            {error ? (
                <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                </p>
            ) : null}
        </section>
    )
}

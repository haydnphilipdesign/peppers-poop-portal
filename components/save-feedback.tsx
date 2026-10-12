'use client'

import { Button } from '@/components/ui/button'
import { useReadOnly, useRequireUnlock } from '@/lib/read-only-context'

/** Keep failed drafts next to a clear recovery action; reads have separate feedback. */
export function SaveFeedback({ error, saved }: { error: string | null; saved?: boolean }) {
    const requireUnlock = useRequireUnlock()
    const isReadOnly = useReadOnly()
    const needsUnlock = Boolean(error?.includes('Unlock editing'))
    if (error) return (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p>{needsUnlock && !isReadOnly ? 'Editing is unlocked. Your input has been kept. Try saving again.' : error}</p>
            {needsUnlock && isReadOnly && requireUnlock ? (
                <Button variant="outline" className="mt-2 min-h-11" onClick={requireUnlock}>Unlock Editing</Button>
            ) : null}
        </div>
    )
    return saved ? <p role="status" className="text-sm text-muted-foreground">Change saved.</p> : null
}

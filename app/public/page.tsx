'use client'

import { ReadOnlyProvider } from '@/lib/read-only-context'
import { PublicDashboard } from '@/components/public-dashboard'

export default function PublicPage() {
    return (
        <ReadOnlyProvider isReadOnly={true}>
            <PublicDashboard />
        </ReadOnlyProvider>
    )
}

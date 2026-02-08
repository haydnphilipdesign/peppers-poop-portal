import type { Metadata } from 'next'
import { ReadOnlyProvider } from '@/lib/read-only-context'
import { PublicDashboard } from '@/components/public-dashboard'

export const metadata: Metadata = {
    title: "Pepper's Portal (Public View)",
    robots: {
        index: false,
        follow: false,
    },
}

export default function PublicPage() {
    return (
        <ReadOnlyProvider isReadOnly={true}>
            <PublicDashboard />
        </ReadOnlyProvider>
    )
}

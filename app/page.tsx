'use client'

import { useUser } from '@/lib/user-context'
import { ProfileSelector } from '@/components/profile-selector'
import { Dashboard } from '@/components/dashboard'

export default function Home() {
  const { user, isLoading } = useUser()

  // Show loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-zinc-900 dark:via-stone-900 dark:to-neutral-900">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🐕</div>
          <p className="text-stone-600 dark:text-stone-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show profile selector if no user selected
  if (!user) {
    return <ProfileSelector />
  }

  // Show dashboard for logged-in user
  return <Dashboard />
}

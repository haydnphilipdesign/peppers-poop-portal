'use client'

import { useUser } from '@/lib/user-context'
import { ProfileSelector } from '@/components/profile-selector'
import { Dashboard } from '@/components/dashboard'

export default function Home() {
  const { user } = useUser()

  // Show profile selector if no user selected
  if (!user) {
    return <ProfileSelector />
  }

  // Show dashboard for logged-in user
  return <Dashboard />
}

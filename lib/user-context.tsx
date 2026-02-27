'use client'

import { createContext, useContext, ReactNode, useSyncExternalStore } from 'react'
import type { UserName } from './database.types'

const STORAGE_KEY = 'peppers-poop-portal-user'
const USER_EVENT = 'ppp:user-changed'
const VALID_USERS: UserName[] = ['Chris', 'Debbie', 'Haydn']

interface UserContextType {
    user: UserName | null
    isHydrated: boolean
    setUser: (user: UserName | null) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function readStoredUser(): UserName | null {
    if (typeof window === 'undefined') {
        return null
    }

    const storedUser = localStorage.getItem(STORAGE_KEY)
    if (!storedUser) {
        return null
    }

    return VALID_USERS.includes(storedUser as UserName)
        ? (storedUser as UserName)
        : null
}

function subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => { }
    }

    const handleStorage = () => callback()
    const handleCustom = () => callback()

    window.addEventListener('storage', handleStorage)
    window.addEventListener(USER_EVENT, handleCustom)

    return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(USER_EVENT, handleCustom)
    }
}

function getServerSnapshot(): UserName | null {
    return null
}

function subscribeNoop(): () => void {
    return () => { }
}

function getHydrationSnapshot(): boolean {
    return true
}

function getHydrationServerSnapshot(): boolean {
    return false
}

export function UserProvider({ children }: { children: ReactNode }) {
    const user = useSyncExternalStore(subscribe, readStoredUser, getServerSnapshot)
    const isHydrated = useSyncExternalStore(
        subscribeNoop,
        getHydrationSnapshot,
        getHydrationServerSnapshot
    )

    const setUser = (newUser: UserName | null) => {
        if (typeof window === 'undefined') {
            return
        }

        if (newUser) {
            localStorage.setItem(STORAGE_KEY, newUser)
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }

        window.dispatchEvent(new Event(USER_EVENT))
    }

    return (
        <UserContext.Provider value={{ user, isHydrated, setUser }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}

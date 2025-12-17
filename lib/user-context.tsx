'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserName } from './database.types'

const STORAGE_KEY = 'peppers-poop-portal-user'

interface UserContextType {
    user: UserName | null
    setUser: (user: UserName | null) => void
    isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUserState] = useState<UserName | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Load user from localStorage on mount
        const storedUser = localStorage.getItem(STORAGE_KEY)
        if (storedUser && ['Chris', 'Debbie', 'Haydn'].includes(storedUser)) {
            setUserState(storedUser as UserName)
        }
        setIsLoading(false)
    }, [])

    const setUser = (newUser: UserName | null) => {
        setUserState(newUser)
        if (newUser) {
            localStorage.setItem(STORAGE_KEY, newUser)
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    }

    return (
        <UserContext.Provider value={{ user, setUser, isLoading }}>
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

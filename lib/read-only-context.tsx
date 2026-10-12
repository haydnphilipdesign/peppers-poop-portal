'use client'

import { createContext, useContext, ReactNode } from 'react'

const ReadOnlyContext = createContext(false)
const RequireUnlockContext = createContext<(() => void) | undefined>(undefined)

export function ReadOnlyProvider({
    children,
    isReadOnly = false,
    onRequireUnlock,
}: {
    children: ReactNode
    isReadOnly?: boolean
    onRequireUnlock?: () => void
}) {
    return (
        <ReadOnlyContext.Provider value={isReadOnly}>
            <RequireUnlockContext.Provider value={onRequireUnlock}>{children}</RequireUnlockContext.Provider>
        </ReadOnlyContext.Provider>
    )
}

export function useRequireUnlock() {
    return useContext(RequireUnlockContext)
}

export function useReadOnly() {
    return useContext(ReadOnlyContext)
}

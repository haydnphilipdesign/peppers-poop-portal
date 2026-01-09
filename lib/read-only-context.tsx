'use client'

import { createContext, useContext, ReactNode } from 'react'

const ReadOnlyContext = createContext(false)

export function ReadOnlyProvider({
    children,
    isReadOnly = false
}: {
    children: ReactNode
    isReadOnly?: boolean
}) {
    return (
        <ReadOnlyContext.Provider value={isReadOnly}>
            {children}
        </ReadOnlyContext.Provider>
    )
}

export function useReadOnly() {
    return useContext(ReadOnlyContext)
}

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextType {
    value: string
    onValueChange: (value: string) => void
    idBase: string
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

interface TabsProps {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
    className?: string
}

function useTabsContext() {
    const context = React.useContext(TabsContext)
    if (!context) {
        throw new Error('Tabs components must be used within <Tabs>.')
    }
    return context
}

function sanitizeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function getTabId(idBase: string, value: string) {
    return `${idBase}-tab-${sanitizeId(value)}`
}

function getPanelId(idBase: string, value: string) {
    return `${idBase}-panel-${sanitizeId(value)}`
}

function focusAndActivate(tablist: HTMLElement, index: number) {
    const tabs = Array.from(
        tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    )
    const target = tabs[index]
    if (!target) {
        return
    }
    target.focus()
    target.click()
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
    const idBase = React.useId()

    return (
        <TabsContext.Provider value={{ value, onValueChange, idBase }}>
            <div className={cn('w-full', className)}>{children}</div>
        </TabsContext.Provider>
    )
}

interface TabsListProps {
    children: React.ReactNode
    className?: string
}

export function TabsList({ children, className }: TabsListProps) {
    return (
        <div
            role="tablist"
            aria-orientation="horizontal"
            className={cn(
                'inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full',
                className
            )}
        >
            {children}
        </div>
    )
}

interface TabsTriggerProps {
    value: string
    children: React.ReactNode
    className?: string
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
    const context = useTabsContext()
    const isActive = context.value === value
    const tabId = getTabId(context.idBase, value)
    const panelId = getPanelId(context.idBase, value)

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const tablist = event.currentTarget.closest('[role="tablist"]') as HTMLElement | null
        if (!tablist) return

        const tabs = Array.from(
            tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        )
        const currentIndex = tabs.indexOf(event.currentTarget)
        if (currentIndex === -1) return

        if (event.key === 'ArrowRight') {
            event.preventDefault()
            focusAndActivate(tablist, (currentIndex + 1) % tabs.length)
            return
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            focusAndActivate(tablist, (currentIndex - 1 + tabs.length) % tabs.length)
            return
        }

        if (event.key === 'Home') {
            event.preventDefault()
            focusAndActivate(tablist, 0)
            return
        }

        if (event.key === 'End') {
            event.preventDefault()
            focusAndActivate(tablist, tabs.length - 1)
        }
    }

    return (
        <button
            id={tabId}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => context.onValueChange(value)}
            onKeyDown={handleKeyDown}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1',
                isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-background/50 hover:text-foreground',
                className
            )}
        >
            {children}
        </button>
    )
}

interface TabsContentProps {
    value: string
    children: React.ReactNode
    className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
    const context = useTabsContext()
    const isActive = context.value === value
    const tabId = getTabId(context.idBase, value)
    const panelId = getPanelId(context.idBase, value)

    return (
        <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            hidden={!isActive}
            className={cn(
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                !isActive && 'hidden',
                className
            )}
        >
            {children}
        </div>
    )
}

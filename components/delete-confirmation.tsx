'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer'
import { SaveFeedback } from '@/components/save-feedback'
import type { Walk } from '@/lib/domain/metrics'

/** Recheck parent metadata too: a Neither walk has no outcome rows. */
export function isUnchangedWalk(target: Walk, current: Walk | undefined): boolean {
    return Boolean(current && current.id === target.id && current.revision === target.revision && current.time.getTime() === target.time.getTime() && current.userName === target.userName && current.hasPoop === target.hasPoop && current.hasPee === target.hasPee && current.logs.length === target.logs.length && target.logs.every(log =>
        current.logs.some(row => row.id === log.id && row.type === log.type && row.created_at === log.created_at && row.user_name === log.user_name)
    ))
}

/** Reuse the walk/PIN drawer's focus trap and scrolling; wait for write acknowledgement. */
export function DeleteConfirmation({ open, description, pending, blocked, error, onCancel, onConfirm }: {
    open: boolean
    description: string
    pending: boolean
    blocked: boolean
    error: string | null
    onCancel: () => void
    onConfirm: () => void
}) {
    const returnFocus = useRef<HTMLElement | null>(null)
    const cancelRef = useRef<HTMLButtonElement | null>(null)
    return (
        <Drawer open={open} dismissible={!pending} onOpenChange={value => { if (!value && !pending) onCancel() }}>
            <DrawerContent className="overflow-y-auto bg-background text-base" onOpenAutoFocus={event => {
                event.preventDefault()
                returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
                cancelRef.current?.focus()
            }} onCloseAutoFocus={event => {
                event.preventDefault()
                if (returnFocus.current?.isConnected) returnFocus.current.focus()
                else document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
            }}>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle className="text-xl">Remove this record?</DrawerTitle>
                        <DrawerDescription className="text-base">{description} This cannot be undone.</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4"><SaveFeedback error={error} /></div>
                    <DrawerFooter>
                        <Button ref={cancelRef} variant="outline" disabled={pending} onClick={onCancel}>Cancel</Button>
                        <Button variant="destructive" disabled={pending || blocked} onClick={onConfirm}>{pending ? 'Removing...' : 'Remove record'}</Button>
                        {blocked && !error ? <p role="status" className="text-sm">Editing is unavailable. Unlock editing or refresh the records before removing.</p> : null}
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

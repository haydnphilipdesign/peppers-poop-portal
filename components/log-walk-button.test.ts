// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
// The drawer trigger asks for the reduced-motion preference, which jsdom lacks.
Object.assign(window, { matchMedia: () => ({ matches: false, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } }) })
vi.mock('@/lib/read-only-context', () => ({ useReadOnly: () => false, useRequireUnlock: () => undefined }))
import { LogWalkButton } from './log-walk-button'

describe('Log Walk confirmation and Undo', () => {
    let root: ReturnType<typeof createRoot>
    let container: HTMLDivElement
    const saved = { id: 'new-walk', revision: 1 }
    const button = (name: string) => {
        const match = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === name || b.getAttribute('aria-label') === name)
        if (!match) throw new Error(`Missing button ${name}`)
        return match
    }
    const render = (props: Partial<React.ComponentProps<typeof LogWalkButton>>) => act(async () => root.render(
        React.createElement(LogWalkButton, { userName: 'Debbie', onLogWalk: vi.fn().mockResolvedValue(saved), hint: 'Logging as Debbie', ...props })
    ))
    const log = async (outcome: string) => {
        await act(async () => button('Log Walk').click())
        await act(async () => button(outcome).click())
    }
    beforeEach(() => {
        container = document.createElement('div'); document.body.appendChild(container)
        root = createRoot(container)
    })
    afterEach(async () => { vi.useRealTimers(); await act(async () => root.unmount()); container.remove() })

    it('names what was saved and removes exactly that walk on Undo, guarding double taps', async () => {
        const undo = vi.fn().mockResolvedValue(undefined)
        await render({ onUndoWalk: undo })
        expect(container.textContent).toContain('Logging as Debbie')
        await log('Both poop and pee')
        expect(container.textContent).toMatch(/✓ Walk saved · \d{1,2}:\d{2} [AP]M · Poop and pee/)
        await act(async () => { button('Undo').click(); button('Undo').click() })
        expect(undo).toHaveBeenCalledTimes(1)
        expect(undo).toHaveBeenCalledWith(saved)
        expect(container.textContent).toContain('Walk removed.')
        expect(() => button('Undo')).toThrow()
    })

    it('keeps Undo and explains the alternative when removal fails', async () => {
        const undo = vi.fn().mockRejectedValueOnce(new Error('This walk or request changed.')).mockResolvedValueOnce(undefined)
        await render({ onUndoWalk: undo })
        await log('Neither — no poop or pee')
        await act(async () => button('Undo').click())
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('This walk or request changed. You can also edit it in today’s walk log.')
        expect(container.textContent).not.toContain('Walk removed.')
        await act(async () => button('Undo').click())
        expect(container.textContent).toContain('Walk removed.')
    })

    it('offers no Undo when the save returns no walk identity', async () => {
        await render({ onUndoWalk: vi.fn(), onLogWalk: vi.fn().mockResolvedValue(undefined) })
        await log('💩Poop')
        expect(container.textContent).toContain('✓ Walk saved')
        expect(() => button('Undo')).toThrow()
    })

    it('withdraws Undo after a minute so it can never remove an older walk', async () => {
        await render({ onUndoWalk: vi.fn() })
        await log('💦Pee')
        expect(button('Undo')).toBeDefined()
        vi.useFakeTimers()
        // Re-render so the pending timer is scheduled on the fake clock.
        await act(async () => root.unmount())
        root = createRoot(container)
        await render({ onUndoWalk: vi.fn() })
        await log('💦Pee')
        expect(button('Undo')).toBeDefined()
        await act(async () => { vi.advanceTimersByTime(60_000) })
        expect(() => button('Undo')).toThrow()
        expect(container.textContent).toContain('✓ Walk saved')
    })

    it('withdraws Undo once the next walk is started', async () => {
        await render({ onUndoWalk: vi.fn() })
        await log('💩Poop')
        expect(button('Undo')).toBeDefined()
        await act(async () => button('Log Walk').click())
        expect(() => button('Undo')).toThrow()
        expect(container.textContent).toContain('Logging as Debbie')
    })
})

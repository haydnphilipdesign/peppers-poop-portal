// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { scheduleReminder } = vi.hoisted(() => ({
    scheduleReminder: vi.fn(),
}))

vi.mock('@/lib/user-context', () => ({
    useUser: () => ({ user: 'Haydn' }),
}))

vi.mock('@/lib/read-only-context', () => ({
    useReadOnly: () => false,
}))

vi.mock('@/hooks/use-reminders', () => ({
    useReminders: () => ({
        getLastCompletedDate: () => null,
        addReminder: vi.fn(),
        scheduleReminder,
        completeReminder: vi.fn(),
        activeGroomingReminder: null,
        activeVetReminder: null,
        isLoading: false,
    }),
}))

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
        void variant
        void size
        return React.createElement('button', props, children)
    },
}))

vi.mock('lucide-react', () => ({
    Calendar: () => null,
    Scissors: () => null,
    Stethoscope: () => null,
    Plus: () => null,
    Loader2: () => null,
    Check: () => null,
}))

import { ReminderManager } from './reminder-manager'

function findButton(container: HTMLElement, label: string, occurrence = 0) {
    const matches = Array.from(container.querySelectorAll('button'))
        .filter(button => button.textContent?.trim() === label)
    const button = matches[occurrence]
    if (!button) throw new Error(`Button not found: ${label} (${occurrence})`)
    return button
}

function findCard(container: HTMLElement, heading: string) {
    const headingElement = Array.from(container.querySelectorAll('p'))
        .find(element => element.textContent === heading)
    const card = headingElement?.closest<HTMLElement>('.rounded-xl')
    if (!card) throw new Error(`Card not found: ${heading}`)
    return card
}

describe('ReminderManager vet appointments', () => {
    let container: HTMLDivElement
    let root: ReturnType<typeof createRoot>

    beforeEach(() => {
        scheduleReminder.mockReset()
        scheduleReminder.mockResolvedValue(undefined)
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('schedules a vet appointment in a future month', async () => {
        await act(async () => root.render(React.createElement(ReminderManager)))
        await act(async () => container.querySelector<HTMLButtonElement>('section > button')?.click())

        const vetCard = findCard(container, 'Vet Visit')
        await act(async () => findButton(vetCard, 'Schedule').click())

        const input = vetCard.querySelector<HTMLInputElement>('input[type="datetime-local"]')
        expect(input).not.toBeNull()

        await act(async () => {
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
            valueSetter?.call(input, '2026-07-10T10:00')
            input?.dispatchEvent(new Event('input', { bubbles: true }))
            input?.dispatchEvent(new Event('change', { bubbles: true }))
        })
        await act(async () => findButton(vetCard, 'Haydn').click())

        expect(scheduleReminder).toHaveBeenCalledWith(
            'vet',
            expect.any(Date),
            'Haydn'
        )
        expect(scheduleReminder.mock.calls[0][1]).toEqual(new Date(2026, 6, 10, 10, 0))
    })
})

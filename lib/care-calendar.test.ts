import { afterEach, describe, expect, it, vi } from 'vitest'
import { calendarScope, dateRange, nextCalendarCheck } from './care-data-context'

afterEach(() => vi.unstubAllEnvs())

describe('device-local calendar boundaries', () => {
    it.each([
        [2026, 2, 8, '2026-03-08T05:00:00.000Z', '2026-03-09T03:59:59.999Z', 23],
        [2026, 10, 1, '2026-11-01T04:00:00.000Z', '2026-11-02T04:59:59.999Z', 25],
    ] as const)('covers the complete DST day on %i/%i/%i', (year, month, day, start, end, hours) => {
        vi.stubEnv('TZ', 'America/New_York')
        const date = new Date(year, month, day, 12)
        const scope = dateRange(date)
        expect(scope).toEqual({ start, end })
        expect(Date.parse(scope.end) + 1 - Date.parse(scope.start)).toBe(hours * 60 * 60_000)
        expect(nextCalendarCheck(new Date(year, month, day, 23, 59, 59))).toBe(1_000)
    })

    it('uses the device timezone in scope identity and range instead of assuming a household zone', () => {
        vi.stubEnv('TZ', 'America/New_York')
        const instant = new Date('2026-11-01T04:30:00Z')
        const eastern = calendarScope(instant)
        const easternRange = dateRange(instant)
        vi.stubEnv('TZ', 'America/Los_Angeles')
        expect(calendarScope(instant).key).not.toBe(eastern.key)
        expect(calendarScope(instant).timezone).toBe('America/Los_Angeles')
        expect(dateRange(instant).start).not.toBe(easternRange.start)
    })
})

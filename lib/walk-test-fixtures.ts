import type { Log, WalkRecord } from './database.types'
/** Existing lifecycle fixtures each describe a known individual outing. */
export const walkFixtures = (logs: Log[]): WalkRecord[] => logs.map(log => ({
    id: log.id, created_at: log.created_at, user_name: log.user_name,
    revision: 1, provenance: 'explicit', deleted_at: null, logs: [log],
}))

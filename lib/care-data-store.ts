import { supabase } from '@/lib/supabase'
import type { Activity, Log, Reminder } from '@/lib/database.types'

export type CareTable = 'logs' | 'activities' | 'reminders'
export type CareRows = { logs: Log[]; activities: Activity[]; reminders: Reminder[] }
export interface CareQuery {
    table: CareTable
    start?: string
    end?: string
    timezone: string
}
export interface CareSnapshot<T> {
    data: T | null
    pending: boolean
    error: string | null
    afterSave: boolean
    updatedAt: number | null
}
type Entry = {
    query: CareQuery
    snapshot: CareSnapshot<CareRows[CareTable]>
    listeners: Set<() => void>
    generation: number
    promise?: Promise<void>
    stale: boolean
}

// Every read uses the same ordering, so exact scopes can share results.
export function careQueryKey(query: CareQuery): string {
    return JSON.stringify([query.table, query.start ?? null, query.end ?? null, query.timezone, 'descending'])
}

export class CareDataStore {
    private entries = new Map<string, Entry>()

    private entry(query: CareQuery): Entry {
        const key = careQueryKey(query)
        let entry = this.entries.get(key)
        if (!entry) {
            entry = { query, snapshot: { data: null, pending: false, error: null, afterSave: false, updatedAt: null }, listeners: new Set(), generation: 0, stale: true }
            this.entries.set(key, entry)
        }
        return entry
    }

    snapshot<T extends CareTable>(query: CareQuery & { table: T }): CareSnapshot<CareRows[T]> {
        return this.entry(query).snapshot as CareSnapshot<CareRows[T]>
    }

    subscribe(query: CareQuery, listener: () => void): () => void {
        const entry = this.entry(query)
        entry.listeners.add(listener)
        return () => {
            entry.listeners.delete(listener)
            // Bound inactive date-navigation snapshots; active/hidden tabs stay subscribed.
            for (const [key, candidate] of this.entries) {
                if (this.entries.size <= 32) break
                if (!candidate.listeners.size) {
                    candidate.generation++
                    this.entries.delete(key)
                }
            }
        }
    }

    private publish(entry: Entry, patch: Partial<Entry['snapshot']>) {
        entry.snapshot = { ...entry.snapshot, ...patch }
        entry.listeners.forEach(listener => listener())
    }

    async read(query: CareQuery, force = false, afterSave = false, supersede = false): Promise<void> {
        const entry = this.entry(query)
        if (!supersede && entry.promise) return entry.promise
        if (!force && !entry.stale && entry.snapshot.updatedAt !== null && Date.now() - entry.snapshot.updatedAt < 60_000) return
        const generation = ++entry.generation
        // Preserve both data and error until a successful retry.
        this.publish(entry, { pending: true, afterSave: afterSave || entry.snapshot.afterSave })
        entry.promise = (async () => {
            try {
                let request = supabase.from(query.table).select('*')
                if (query.start) request = request.gte('created_at', query.start)
                if (query.end) request = request.lte('created_at', query.end)
                const result = await request.order(query.table === 'reminders' ? 'due_date' : 'created_at', { ascending: false })
                if (result.error) throw result.error
                if (generation !== entry.generation) return
                entry.stale = false
                this.publish(entry, { data: result.data ?? [], error: null, afterSave: false, updatedAt: Date.now() })
            } catch {
                if (generation !== entry.generation) return
                entry.stale = true
                this.publish(entry, { error: 'Read unavailable', afterSave: afterSave || entry.snapshot.afterSave })
            } finally {
                if (generation === entry.generation) {
                    entry.promise = undefined
                    this.publish(entry, { pending: false })
                }
            }
        })()
        return entry.promise
    }

    invalidate(tables: CareTable[], afterSave = false) {
        for (const entry of this.entries.values()) {
            if (!tables.includes(entry.query.table)) continue
            entry.stale = true
            // A write/foreground return supersedes even an unfinished pre-change read.
            if (entry.listeners.size) void this.read(entry.query, true, afterSave, true)
            else {
                entry.generation++
                entry.promise = undefined
            }
        }
    }

    cancel() {
        for (const entry of this.entries.values()) {
            entry.generation++
            entry.promise = undefined
            entry.stale = true
        }
    }
}

export function careReadError(snapshot: CareSnapshot<unknown>, label: string): string | null {
    if (!snapshot.error) return null
    return snapshot.afterSave
        ? `Change saved, but ${label} could not refresh. Please refresh; do not save again.`
        : `${label[0].toUpperCase()}${label.slice(1)} could not be checked. Displayed data may be out of date. Please refresh.`
}

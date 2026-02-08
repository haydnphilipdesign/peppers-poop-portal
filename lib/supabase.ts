import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const hasValidConfig =
    Boolean(supabaseAnonKey) && /^https?:\/\//.test(supabaseUrl)

function createMockClient(): SupabaseClient<Database> {
    const writeError = {
        message:
            'Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    }

    return {
        from: () => ({
            select: () => ({
                gte: () => ({
                    lte: () => ({
                        order: () => Promise.resolve({ data: [], error: null }),
                    }),
                    order: () => Promise.resolve({ data: [], error: null }),
                }),
                not: () => ({
                    gte: () => ({
                        lte: () => Promise.resolve({ data: [], error: null }),
                    }),
                    order: () => Promise.resolve({ data: [], error: null }),
                }),
                order: () => Promise.resolve({ data: [], error: null }),
            }),
            insert: () => Promise.resolve({ data: null, error: writeError }),
            update: () => ({
                eq: () => Promise.resolve({ data: null, error: writeError }),
            }),
            delete: () => ({
                in: () => Promise.resolve({ data: null, error: writeError }),
            }),
        }),
    } as unknown as SupabaseClient<Database>
}

export const supabase = hasValidConfig
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : createMockClient()

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a placeholder client that will be properly initialized when env vars are set
let supabase: SupabaseClient

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
    // Create a mock client for build time / when env vars are not set
    // This prevents build errors while still allowing the app to be built
    supabase = {
        from: () => ({
            select: () => ({
                gte: () => ({
                    lte: () => ({
                        order: () => Promise.resolve({ data: [], error: null })
                    }),
                    order: () => Promise.resolve({ data: [], error: null })
                }),
                order: () => Promise.resolve({ data: [], error: null })
            }),
            insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        }),
    } as unknown as SupabaseClient
}

export { supabase }

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Log configuration status (will show in browser console)
if (typeof window !== 'undefined') {
    console.log('Supabase config:', {
        urlSet: !!supabaseUrl,
        urlStartsWithHttp: supabaseUrl.startsWith('http'),
        keySet: !!supabaseAnonKey,
        keyLength: supabaseAnonKey.length
    })
}

// Create a real client if env vars are set, otherwise mock for build
let supabase: SupabaseClient

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
    // Create a mock client for build time / when env vars are not set
    console.warn('Supabase not configured - using mock client')
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
            insert: () => Promise.resolve({
                data: null,
                error: {
                    message: 'Supabase not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.',
                    code: 'CONFIG_ERROR',
                    details: `URL set: ${!!supabaseUrl}, Key set: ${!!supabaseAnonKey}`
                }
            }),
        }),
    } as unknown as SupabaseClient
}

export { supabase }

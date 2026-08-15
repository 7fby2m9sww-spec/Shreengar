import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (err) {
          console.error('[SERVER-COOKIE-ERROR]', err)
        }
      },
    },
  })
}

function getAdminEnvironment() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SECRET_KEY,
  }
}

export function createAdminClient() {
  const env = getAdminEnvironment()
  const supabaseUrl = env.url
  const supabaseServiceKey = env.serviceKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_SERVER_CONFIGURATION_MISSING')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  })
}

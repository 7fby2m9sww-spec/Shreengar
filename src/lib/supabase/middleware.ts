import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isUserActiveAdmin } from '@/services/auth'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Re-validate auth user with getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Allow admin auth endpoints
  if (path === '/admin/setup' || path === '/admin/forgot-password' || path === '/admin/reset-password') {
    return supabaseResponse
  }

  if (path === '/admin/login' || path === '/admin/verify-otp') {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 1. Strictly Protect Admin Portal routes (Redirect unauthenticated/unauthorized users to /auth/login)
  if (path.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    const isAdmin = await isUserActiveAdmin(user.id, supabase)
    if (!isAdmin) {
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }
  }



  return supabaseResponse
}

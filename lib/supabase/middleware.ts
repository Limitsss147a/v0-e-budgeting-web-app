import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create a supabase client to handle authentication in the middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  /**
   * IMPORTANT: Always call getUser() to refresh the session.
   * Do not remove this, it ensures the user's session is still valid.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public/Auth routes that don't require protection
  const isAuthPage = pathname.startsWith('/auth/')
  const publicRoutes = ['/', '/landing', '/auth/login', '/auth/sign-up', '/auth/sign-up-success', '/auth/error', '/auth/callback', '/auth/forgot-password', '/auth/reset-password']
  
  // Logic fix for isPublicRoute: 
  // - If it's in publicRoutes
  // - If it's an auth page (except for callback which is special)
  const isPublicRoute = publicRoutes.includes(pathname) || (isAuthPage && pathname !== '/auth/callback')

  /**
   * Protected routes - redirect to login if not authenticated
   * We also ignore system routes like _next/static, favicon.ico, etc.
   */
  if (!user && !isPublicRoute && !pathname.startsWith('/_next') && pathname !== '/favicon.ico') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    
    // Construct the redirect response
    const redirectResponse = NextResponse.redirect(url)
    
    // IMPORTANT: Make sure to copy cookies from the supabaseResponse to the redirect response.
    // If we don't do this, the refreshed session might be lost.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  /**
   * Admin-only routes — server-side enforcement (defense-in-depth).
   * Even though RLS protects database data, this prevents non-admins from
   * accessing admin UI pages at the middleware level.
   * 
   * Also checks is_approved for all dashboard routes (P0).
   */
  const adminOnlyPrefixes = [
    '/dashboard/users',
    '/dashboard/review',
    '/dashboard/institutions',
    '/dashboard/manage-budgets',
    '/dashboard/audit-log',
  ]

  const isAdminRoute = adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))
  const isDashboardRoute = pathname.startsWith('/dashboard')

  if (user && isDashboardRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()

    // P0: Check if user is approved
    if (profile && !profile.is_approved && profile.role !== 'admin') {
      // Allow access to pending-approval page only
      if (pathname !== '/dashboard/pending-approval') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/pending-approval'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
      }
    }

    // Admin route protection
    if (isAdminRoute && (!profile || profile.role !== 'admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('forbidden', '1')
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return redirectResponse
    }
  }

  /**
   * If user is logged in and trying to access auth pages (login, sign-up, etc.), 
   * redirect them to the dashboard.
   */
  if (user && isAuthPage && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    
    const redirectResponse = NextResponse.redirect(url)
    
    // Copy cookies to persist the session refresh
    supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  // Fall through to returning the original supabaseResponse which contains the updated cookies
  return supabaseResponse
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Set a JS-readable CSRF cookie for the smart-search API (double-submit pattern).
  // SameSite=Strict prevents cross-origin reads; the API validates header === cookie.
  // Uses globalThis.crypto.randomUUID() — available in Edge Runtime (Web Crypto API).
  if (!request.cookies.get('__sa_csrf')) {
    const token = globalThis.crypto.randomUUID()
    response.cookies.set('__sa_csrf', token, {
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: false,       // must be JS-readable
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  // Auth-gate /dashboard (consumer)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/?auth=required', request.url))
  }

  // Auth-gate /providers/dashboard and /providers/claim — use main auth modal
  const providerAuthRoutes = ['/providers/dashboard', '/providers/claim']
  if (!user && providerAuthRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/?auth=required', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

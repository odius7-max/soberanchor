import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { CONTINUATION_PARAM, validateContinuation } from '@/lib/claim-continuation'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Mint a JS-readable CSRF token for the smart-search API (double-submit pattern).
  // SameSite=Strict prevents cross-origin reads; the API validates header === cookie.
  // Uses globalThis.crypto.randomUUID() — available in Edge Runtime (Web Crypto API).
  //
  // The cookie is applied via applyCsrf() at every return point rather than here,
  // because the Supabase SSR setAll callback below reassigns `response` to a fresh
  // NextResponse — which silently discarded any Set-Cookie written beforehand and
  // left anonymous visitors without a token (403 from /api/smart-search).
  const csrfToken = request.cookies.get('__sa_csrf')
    ? null
    : globalThis.crypto.randomUUID()

  const applyCsrf = (res: NextResponse) => {
    if (csrfToken) {
      res.cookies.set('__sa_csrf', csrfToken, {
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: false,       // must be JS-readable
      })
    }
    return res
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

  // Send an unauthenticated visitor to the homepage auth modal, carrying where
  // they were going so the claim survives sign-in (ODI-66). The continuation is
  // validated by the shared validator, so only an exact /providers/claim target
  // (optionally with one facility UUID) can ever be attached — never an
  // arbitrary redirect, and never /providers/claim-evil.
  function toAuth() {
    const target = new URL('/?auth=required', request.url)
    const continuation = validateContinuation(
      request.nextUrl.pathname + request.nextUrl.search
    )
    if (continuation) target.searchParams.set(CONTINUATION_PARAM, continuation)
    return applyCsrf(NextResponse.redirect(target))
  }

  // Auth-gate /dashboard (consumer)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return toAuth()
  }

  // Auth-gate /providers/dashboard and /providers/claim — use main auth modal
  // /providers/welcome is an ORDINARY authenticated destination (R5): it gets
  // the auth guard and the continuation-preserving redirect, and nothing else.
  // It is deliberately NOT added to SELF_ROUTING_PATHS — /auth/continue stays
  // the sole callback navigation owner, and a second owner is exactly the race
  // ODI-66/R5 was fixed to remove.
  // NOTE: matched by startsWith, so decoys like /providers/welcome-evil are
  // auth-gated too. Known and harmless — over-gating is safe, and the shared
  // validator still attaches no continuation to a path it doesn't recognise.
  const providerAuthRoutes = ['/providers/dashboard', '/providers/claim', '/providers/welcome']
  if (!user && providerAuthRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    return toAuth()
  }

  return applyCsrf(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

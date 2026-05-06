import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

const BUREAU_PATHS = ["/dashboard", "/devis", "/clients", "/inbox", "/parametres"]
const TERRAIN_PATHS = ["/terrain"]
const SUPERADMIN_PATHS = ["/superadmin"]

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[middleware] Missing Supabase env vars — skipping auth')
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let supabaseUser = null
  try {
    const { data } = await supabase.auth.getUser()
    supabaseUser = data.user
  } catch {
    console.error('[middleware] supabase.auth.getUser() threw — failing closed')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let user = supabaseUser
  let role = user?.user_metadata?.role as string | undefined

  if (process.env.NODE_ENV !== "production" || process.env.IS_E2E === "true") {
    const testUserCookie = request.cookies.get("cypress-test-user")?.value
    if (testUserCookie === "ouvrier") {
      user = { id: "test-user-id", email: "ouvrier@test.com", user_metadata: { role: "ouvrier" } } as any
      role = "ouvrier"
    } else if (testUserCookie === "admin") {
      user = { id: "test-user-admin", email: "admin@test.com", user_metadata: { role: "admin" } } as any
      role = "admin"
    } else if (testUserCookie === "bureau") {
      user = { id: "test-user-bureau", email: "bureau@test.com", user_metadata: { role: "bureau" } } as any
      role = "bureau"
    } else if (testUserCookie === "super_admin") {
      user = { id: "test-superadmin-id", email: "superadmin@test.com", user_metadata: { role: "super_admin" } } as any
      role = "super_admin"
    }
  }

  if (pathname === "/login") {
    if (!user) return response
    if (role === "super_admin") return NextResponse.redirect(new URL("/superadmin/workspaces", request.url))
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Superadmin paths: super_admin only
  if (SUPERADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Bureau/terrain paths: block super_admin
  if (
    BUREAU_PATHS.some((p) => pathname.startsWith(p)) ||
    TERRAIN_PATHS.some((p) => pathname.startsWith(p))
  ) {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/superadmin/workspaces", request.url))
    }
  }

  if (BUREAU_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "admin" && role !== "bureau") {
      return NextResponse.redirect(new URL("/profil", request.url))
    }
  }

  if (TERRAIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "admin" && role !== "ouvrier") {
      return NextResponse.redirect(new URL("/profil", request.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}

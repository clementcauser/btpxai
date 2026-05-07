import { NextRequest, NextResponse } from "next/server"

const BUREAU_PATHS = ["/dashboard", "/devis", "/clients", "/inbox", "/parametres"]
const TERRAIN_PATHS = ["/terrain"]
const SUPERADMIN_PATHS = ["/superadmin"]

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
  } catch {
    return null
  }
}

// Reads the Supabase session cookie and extracts the user role from the JWT.
// Supabase stores the session as JSON in sb-<project-ref>-auth-token.
// Large tokens are chunked into .0, .1, ... suffixes.
function getRoleFromRequest(request: NextRequest): string | null {
  try {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https?:\/\/([^.]+)/
    )?.[1]
    if (!projectRef) return null

    const baseName = `sb-${projectRef}-auth-token`
    let raw = request.cookies.get(baseName)?.value

    if (!raw) {
      const chunks: string[] = []
      for (let i = 0; i < 10; i++) {
        const chunk = request.cookies.get(`${baseName}.${i}`)?.value
        if (!chunk) break
        chunks.push(chunk)
      }
      if (chunks.length > 0) raw = chunks.join("")
    }

    if (!raw) return null

    let session: { access_token?: string }
    try {
      session = JSON.parse(raw)
    } catch {
      session = JSON.parse(decodeURIComponent(raw))
    }

    const payload = decodeJWT(session?.access_token ?? "")
    if (!payload) return null

    return (payload.user_metadata as Record<string, unknown>)?.role as string ?? null
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    let role: string | null = null

    if (process.env.NODE_ENV !== "production" || process.env.IS_E2E === "true") {
      const testCookie = request.cookies.get("cypress-test-user")?.value
      const roleMap: Record<string, string> = {
        ouvrier: "ouvrier",
        admin: "admin",
        bureau: "bureau",
        super_admin: "super_admin",
      }
      if (testCookie && testCookie in roleMap) role = roleMap[testCookie]
    }

    if (role === null) role = getRoleFromRequest(request)

    const isAuthenticated = role !== null

    if (pathname === "/login") {
      if (!isAuthenticated) return NextResponse.next()
      if (role === "super_admin")
        return NextResponse.redirect(new URL("/superadmin/workspaces", request.url))
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    if (SUPERADMIN_PATHS.some((p) => pathname.startsWith(p))) {
      if (role !== "super_admin")
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    if (
      BUREAU_PATHS.some((p) => pathname.startsWith(p)) ||
      TERRAIN_PATHS.some((p) => pathname.startsWith(p))
    ) {
      if (role === "super_admin")
        return NextResponse.redirect(new URL("/superadmin/workspaces", request.url))
    }

    if (BUREAU_PATHS.some((p) => pathname.startsWith(p))) {
      if (role !== "admin" && role !== "bureau")
        return NextResponse.redirect(new URL("/profil", request.url))
    }

    if (TERRAIN_PATHS.some((p) => pathname.startsWith(p))) {
      if (role !== "admin" && role !== "ouvrier")
        return NextResponse.redirect(new URL("/profil", request.url))
    }

    return NextResponse.next({ request })
  } catch {
    if (request.nextUrl.pathname === "/login") return NextResponse.next()
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}

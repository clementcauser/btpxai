import { NextRequest, NextResponse } from "next/server"
import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "@/lib/auth"

const BUREAU_PATHS = ["/dashboard", "/devis", "/clients", "/inbox", "/parametres"]
const TERRAIN_PATHS = ["/terrain"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  })

  if (pathname === "/login") {
    return session
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next()
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const role = (session.user as { role?: string }).role

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

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}

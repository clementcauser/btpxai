import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

const BUREAU_PATHS = ["/dashboard", "/devis", "/clients", "/inbox", "/parametres"]
const TERRAIN_PATHS = ["/terrain"]

export async function middleware(request: NextRequest) {
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

  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  let user = supabaseUser
  let role = user?.user_metadata?.role as string | undefined

  if (process.env.NODE_ENV !== "production") {
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
    }
  }

  if (pathname === "/login") {
    return user
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : response
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
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

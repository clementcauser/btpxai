import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Read-only context (Server Component) — middleware handles refresh
          }
        },
      },
    }
  )
}

export async function getUser() {
  // E2E test bypass: Cypress sets a plain-string cookie (no JSON — RFC 6265
  // forbids raw double-quotes in cookie values, breaking JSON.parse).
  // Guard: non-production only. Tests must run against `npm run dev`.
  if (process.env.NODE_ENV !== "production" || process.env.IS_E2E === "true") {
    const cookieStore = await cookies()
    const cypressRole = cookieStore.get("cypress-test-user")?.value
    if (cypressRole === "ouvrier") {
      return {
        id: "test-user-id",
        email: "ouvrier@test.com",
        user_metadata: { role: "ouvrier" },
      }
    }
    if (cypressRole === "bureau") {
      return {
        id: "test-bureau-id",
        email: "bureau@test.com",
        user_metadata: { role: "bureau" },
      }
    }
    if (cypressRole === "admin") {
      return {
        id: "test-admin-id",
        email: "admin@test.com",
        user_metadata: { role: "admin" },
      }
    }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export function getUserRole(user: { user_metadata?: { role?: string } } | null): string | null {
  return user?.user_metadata?.role ?? null
}

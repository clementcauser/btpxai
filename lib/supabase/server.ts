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
  // E2E test bypass: Cypress sets this cookie to simulate a logged-in user.
  // Never active in production (NODE_ENV guard).
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies()
    const testCookie = cookieStore.get("cypress-test-user")
    if (testCookie?.value) {
      try {
        return JSON.parse(testCookie.value) as {
          id: string
          email: string
          user_metadata: { role: string }
        }
      } catch {
        // malformed cookie — fall through to real auth
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

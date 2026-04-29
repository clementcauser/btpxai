import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"
import type { EmailSummary, EmailDetail } from "@/types"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

export async function getValidAccessToken(): Promise<string> {
  const { data: conn } = await supabaseService
    .from("gmail_connections")
    .select("*")
    .limit(1)
    .single()

  if (!conn) throw new Error("Aucune connexion Gmail configurée")

  const isExpired = new Date(conn.expires_at) <= new Date()
  if (!isExpired) return conn.access_token

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) throw new Error("Échec du refresh token Gmail")

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string
    expires_in: number
  }

  const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

  await supabaseService
    .from("gmail_connections")
    .update({ access_token, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
    .eq("id", conn.id)

  return access_token
}

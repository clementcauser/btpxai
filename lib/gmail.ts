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

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

export async function listEmails(
  options: { maxResults?: number; query?: string } = {}
): Promise<EmailSummary[]> {
  const token = await getValidAccessToken()
  const { maxResults = 20, query } = options

  const params = new URLSearchParams({ maxResults: String(maxResults), labelIds: "INBOX" })
  if (query) params.set("q", query)

  const listRes = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!listRes.ok) throw new Error("Erreur Gmail API (list)")

  const listData = (await listRes.json()) as { messages?: { id: string; threadId: string }[] }
  if (!listData.messages?.length) return []

  const messages = await Promise.all(
    listData.messages.map(async ({ id, threadId }) => {
      const msgRes = await fetch(
        `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!msgRes.ok) throw new Error(`Erreur Gmail API (get ${id})`)

      const msg = (await msgRes.json()) as {
        id: string
        threadId: string
        labelIds: string[]
        snippet: string
        payload: { headers: { name: string; value: string }[] }
      }

      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getHeader(msg.payload.headers, "Subject"),
        from: getHeader(msg.payload.headers, "From"),
        date: getHeader(msg.payload.headers, "Date"),
        snippet: msg.snippet,
        isRead: !msg.labelIds.includes("UNREAD"),
      }
    })
  )

  return messages
}

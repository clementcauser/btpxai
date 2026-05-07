import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"
import type { EmailSummary, EmailDetail, EmailAttachment, GmailConnection } from "@/types"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

type GmailPart = {
  mimeType: string
  filename?: string
  body?: { data?: string; attachmentId?: string; size?: number }
  parts?: GmailPart[]
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

function extractBody(part: GmailPart): string {
  if (part.mimeType === "text/html" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8")
  }
  if (part.parts) {
    const html = part.parts.find((p) => p.mimeType === "text/html")
    if (html?.body?.data) return Buffer.from(html.body.data, "base64url").toString("utf-8")
    const plain = part.parts.find((p) => p.mimeType === "text/plain")
    if (plain?.body?.data) return Buffer.from(plain.body.data, "base64url").toString("utf-8")
  }
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8")
  }
  return ""
}

function extractAttachments(part: GmailPart): EmailAttachment[] {
  const attachments: EmailAttachment[] = []
  if (part.filename && part.body?.attachmentId) {
    attachments.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.body.size ?? 0,
    })
  }
  if (part.parts) {
    for (const p of part.parts) {
      attachments.push(...extractAttachments(p))
    }
  }
  return attachments
}

export class GmailClient {
  private constructor(private connection: GmailConnection) {}

  static async forConnection(connectionId: string, workspaceId: string): Promise<GmailClient> {
    const { data: conn } = await supabaseService
      .from("gmail_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single()

    if (!conn) throw new Error("Connexion Gmail introuvable ou accès refusé")
    return new GmailClient(conn as GmailConnection)
  }

  static async allForWorkspace(workspaceId: string): Promise<GmailClient[]> {
    const { data: conns } = await supabaseService
      .from("gmail_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })

    if (!conns?.length) return []
    return conns.map((conn) => new GmailClient(conn as GmailConnection))
  }

  get email(): string {
    return this.connection.email
  }

  get connectionId(): string {
    return this.connection.id
  }

  get label(): string {
    return this.connection.label
  }

  private async getValidAccessToken(): Promise<string> {
    const isExpired = new Date(this.connection.expires_at) <= new Date()
    if (!isExpired) return this.connection.access_token

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: this.connection.refresh_token,
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
      .eq("id", this.connection.id)

    this.connection.access_token = access_token
    this.connection.expires_at = newExpiresAt

    return access_token
  }

  async listEmails(options: { maxResults?: number; query?: string } = {}): Promise<EmailSummary[]> {
    const token = await this.getValidAccessToken()
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
      listData.messages.map(async ({ id }) => {
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

  async getEmail(id: string): Promise<EmailDetail> {
    const token = await this.getValidAccessToken()

    const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Erreur Gmail API (getEmail ${id})`)

    const msg = (await res.json()) as {
      id: string
      threadId: string
      labelIds: string[]
      snippet: string
      payload: GmailPart & { headers: { name: string; value: string }[] }
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      subject: getHeader(msg.payload.headers, "Subject"),
      from: getHeader(msg.payload.headers, "From"),
      date: getHeader(msg.payload.headers, "Date"),
      snippet: msg.snippet,
      isRead: !msg.labelIds.includes("UNREAD"),
      body: extractBody(msg.payload),
      attachments: extractAttachments(msg.payload),
    }
  }

  async getAttachmentData(messageId: string, attachmentId: string): Promise<Buffer> {
    const token = await this.getValidAccessToken()

    const res = await fetch(`${GMAIL_API}/messages/${messageId}/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Erreur Gmail API (getAttachment ${attachmentId})`)

    const data = (await res.json()) as { size: number; data: string }
    return Buffer.from(data.data, "base64url")
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    replyToMessageId?: string
  ): Promise<void> {
    const token = await this.getValidAccessToken()

    const lines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
    ]
    if (replyToMessageId) {
      lines.push(`In-Reply-To: ${replyToMessageId}`)
      lines.push(`References: ${replyToMessageId}`)
    }
    lines.push("", body)

    const raw = Buffer.from(lines.join("\r\n")).toString("base64url")

    const res = await fetch(`${GMAIL_API}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    })

    if (!res.ok) throw new Error("Erreur Gmail API (sendEmail)")
  }

  async markAsRead(id: string): Promise<void> {
    const token = await this.getValidAccessToken()

    const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    })

    if (!res.ok) throw new Error(`Erreur Gmail API (markAsRead ${id})`)
  }

  async archiveEmail(id: string): Promise<void> {
    const token = await this.getValidAccessToken()

    const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ removeLabelIds: ["INBOX", "UNREAD"] }),
    })

    if (!res.ok) throw new Error(`Erreur Gmail API (archiveEmail ${id})`)
  }
}


import { ImapFlow } from "imapflow"
import nodemailer from "nodemailer"
import { supabaseService } from "@/lib/supabase/service"
import { decryptPassword } from "@/lib/crypto"
import type { EmailSummary, EmailDetail, EmailAttachment } from "@/types"

export type ImapConnectionRecord = {
  id: string
  workspace_id: string
  email: string
  label: string
  imap_host: string
  imap_port: number
  imap_secure: boolean
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  username: string
  password_encrypted: string
  created_at: string
  updated_at: string
}

// ─── Error helpers ───────────────────────────────────────────────────────────

function extractMailError(err: unknown, protocol: "IMAP" | "SMTP"): string {
  if (!(err instanceof Error)) return `Erreur ${protocol} inconnue`
  const e = err as Error & { response?: string; responseCode?: number; command?: string }
  if (e.response) return `${protocol} : ${e.response.trim()}`
  return `${protocol} : ${e.message}`
}

// ─── MIME helpers ────────────────────────────────────────────────────────────

function extractTextFromMime(raw: string): { html: string | null; plain: string | null } {
  // Locate Content-Type boundary
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i)
  if (!boundaryMatch) {
    // Not multipart — determine type from headers
    const isHtml = /content-type:\s*text\/html/i.test(raw)
    const bodyStart = raw.indexOf("\r\n\r\n")
    const body = bodyStart !== -1 ? raw.slice(bodyStart + 4) : raw
    const decoded = decodeTransferEncoding(body, raw)
    return isHtml ? { html: decoded, plain: null } : { html: null, plain: decoded }
  }

  const boundary = boundaryMatch[1]!.trim()
  const parts = raw.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?`))
  let html: string | null = null
  let plain: string | null = null

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n")
    if (headerEnd === -1) continue
    const headers = part.slice(0, headerEnd)
    const body = part.slice(headerEnd + 4)
    if (/content-type:\s*text\/html/i.test(headers)) {
      html = decodeTransferEncoding(body.trimEnd(), headers)
    } else if (/content-type:\s*text\/plain/i.test(headers) && !plain) {
      plain = decodeTransferEncoding(body.trimEnd(), headers)
    }
  }

  return { html, plain }
}

function decodeTransferEncoding(body: string, headers: string): string {
  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    return decodeQuotedPrintable(body)
  }
  if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8")
  }
  return body
}

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function extractAttachments(
  raw: string,
  uid: number
): EmailAttachment[] {
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i)
  if (!boundaryMatch) return []

  const boundary = boundaryMatch[1]!.trim()
  const parts = raw.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?`))
  const attachments: EmailAttachment[] = []

  let partIndex = 0
  for (const part of parts) {
    partIndex++
    const headerEnd = part.indexOf("\r\n\r\n")
    if (headerEnd === -1) continue
    const headers = part.slice(0, headerEnd)

    const dispositionMatch = headers.match(/content-disposition:\s*attachment[^;\r\n]*;?\s*(?:filename="?([^"\r\n;]*)"?)?/i)
    const filenameMatch =
      headers.match(/filename="?([^"\r\n;]*)"?/i) ||
      headers.match(/name="?([^"\r\n;]*)"?/i)

    if (!dispositionMatch && !filenameMatch) continue

    const filename = filenameMatch?.[1]?.trim() ?? "attachment"
    const mimeMatch = headers.match(/content-type:\s*([^;\r\n]+)/i)
    const mimeType = mimeMatch?.[1]?.trim() ?? "application/octet-stream"
    const body = part.slice(headerEnd + 4).trimEnd()
    const sizeBytes = Buffer.byteLength(body.replace(/\s+/g, ""), "base64")

    attachments.push({
      attachmentId: `${uid}:${partIndex}`,
      filename,
      mimeType,
      size: sizeBytes,
    })
  }

  return attachments
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function formatAddress(addr: { name?: string; address?: string } | undefined): string {
  if (!addr) return ""
  if (addr.name && addr.address) return `${addr.name} <${addr.address}>`
  return addr.address ?? addr.name ?? ""
}

function extractMessageId(raw: string): string | null {
  const m = raw.match(/^message-id:\s*(.+)$/im)
  return m?.[1]?.trim() ?? null
}

function extractHeader(raw: string, name: string): string | null {
  const m = raw.match(new RegExp(`^${name}:\\s*(.+)$`, "im"))
  return m?.[1]?.trim() ?? null
}

// ─── ImapClient ───────────────────────────────────────────────────────────────

export class ImapClient {
  private constructor(private conn: ImapConnectionRecord) {}

  get connectionId(): string {
    return this.conn.id
  }

  get email(): string {
    return this.conn.email
  }

  get label(): string {
    return this.conn.label
  }

  static async forConnection(connectionId: string, workspaceId: string): Promise<ImapClient> {
    const { data, error } = await (supabaseService as any)
      .from("imap_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single()
    if (error || !data) throw new Error(`IMAP connection not found: ${connectionId}`)
    return new ImapClient(data as ImapConnectionRecord)
  }

  static async allForWorkspace(workspaceId: string): Promise<ImapClient[]> {
    const { data, error } = await (supabaseService as any)
      .from("imap_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
    if (error) throw new Error(`Failed to load IMAP connections: ${error.message}`)
    return ((data ?? []) as ImapConnectionRecord[]).map((c) => new ImapClient(c))
  }

  private buildImapFlow(): ImapFlow {
    return new ImapFlow({
      host: this.conn.imap_host,
      port: this.conn.imap_port,
      secure: this.conn.imap_secure,
      auth: {
        user: this.conn.username,
        pass: decryptPassword(this.conn.password_encrypted),
      },
      logger: false,
      tls: { rejectUnauthorized: false },
    })
  }

  private async withImapClient<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
    const client = this.buildImapFlow()
    await client.connect()
    try {
      return await fn(client)
    } finally {
      await client.logout().catch(() => null)
    }
  }

  async listEmails(options: { maxResults?: number } = {}): Promise<EmailSummary[]> {
    const limit = options.maxResults ?? 50

    return this.withImapClient(async (client) => {
      const mailbox = await client.mailboxOpen("INBOX")
      if (mailbox.exists === 0) return []

      // Fetch the last N messages by sequence range
      const total = mailbox.exists
      const from = Math.max(1, total - limit + 1)
      const range = `${from}:${total}`

      const messages: EmailSummary[] = []

      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      })) {
        const uid = msg.uid
        const env = msg.envelope
        const from_addr = formatAddress(env?.from?.[0] as any)
        const messageId = (env as any)?.messageId ?? String(uid)
        const isRead = msg.flags?.has("\\Seen") ?? false

        messages.push({
          id: String(uid),
          threadId: messageId,
          subject: env?.subject ?? "(sans objet)",
          from: from_addr,
          date: (env?.date ?? new Date()).toISOString(),
          snippet: "",
          isRead,
        })
      }

      return messages.reverse()
    })
  }

  async getEmail(id: string): Promise<EmailDetail> {
    const uid = parseInt(id, 10)

    return this.withImapClient(async (client) => {
      await client.mailboxOpen("INBOX")

      const msg = await client.fetchOne(
        String(uid),
        { source: true, uid: true, envelope: true, flags: true },
        { uid: true }
      )

      if (!msg) throw new Error(`Message UID ${uid} not found`)

      const raw = (msg.source ?? Buffer.alloc(0)).toString("utf8")
      const { html, plain } = extractTextFromMime(raw)
      const attachments = extractAttachments(raw, uid)
      const messageId = extractMessageId(raw) ?? String(uid)
      const fromHeader = extractHeader(raw, "from")
      const env = msg.envelope

      return {
        id: String(uid),
        threadId: messageId,
        subject: env?.subject ?? "(sans objet)",
        from: fromHeader ?? formatAddress((env?.from as any)?.[0]),
        date: (env?.date ?? new Date()).toISOString(),
        snippet: "",
        isRead: msg.flags?.has("\\Seen") ?? false,
        body: html ?? plain ?? "",
        attachments,
      }
    })
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    replyToMessageId?: string
  ): Promise<void> {
    const password = decryptPassword(this.conn.password_encrypted)
    const transport = nodemailer.createTransport({
      host: this.conn.smtp_host,
      port: this.conn.smtp_port,
      secure: this.conn.smtp_secure,
      requireTLS: !this.conn.smtp_secure,
      auth: { user: this.conn.username, pass: password },
    })

    await transport.sendMail({
      from: this.conn.email,
      to,
      subject,
      html: body,
      ...(replyToMessageId
        ? { inReplyTo: replyToMessageId, references: replyToMessageId }
        : {}),
    })
  }

  async markAsRead(id: string): Promise<void> {
    const uid = parseInt(id, 10)
    await this.withImapClient(async (client) => {
      await client.mailboxOpen("INBOX")
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true })
    })
  }

  async archiveEmail(id: string): Promise<void> {
    const uid = parseInt(id, 10)
    await this.withImapClient(async (client) => {
      await client.mailboxOpen("INBOX")
      // Try standard Archive folder names
      const archiveFolders = ["Archive", "Archivé", "Archives", "INBOX.Archive"]
      let moved = false
      for (const folder of archiveFolders) {
        try {
          await client.messageMove(String(uid), folder, { uid: true })
          moved = true
          break
        } catch {
          // Folder doesn't exist, try next
        }
      }
      if (!moved) {
        // Create Archive folder and move
        await client.mailboxCreate("Archive").catch(() => null)
        await client.messageMove(String(uid), "Archive", { uid: true })
      }
    })
  }

  // Used by the connect route to test credentials before saving
  static async testConnection(config: {
    imap_host: string
    imap_port: number
    imap_secure: boolean
    smtp_host: string
    smtp_port: number
    smtp_secure: boolean
    username: string
    password: string
  }): Promise<void> {
    // Test IMAP
    const imapClient = new ImapFlow({
      host: config.imap_host,
      port: config.imap_port,
      secure: config.imap_secure,
      auth: { user: config.username, pass: config.password },
      logger: false,
      tls: { rejectUnauthorized: false },
    })
    try {
      await imapClient.connect()
      await imapClient.logout()
    } catch (err) {
      const detail = extractMailError(err, "IMAP")
      throw new Error(detail)
    }

    // Test SMTP
    const transport = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      requireTLS: !config.smtp_secure,
      auth: { user: config.username, pass: config.password },
      tls: { rejectUnauthorized: false },
    })
    try {
      await transport.verify()
    } catch (err) {
      const detail = extractMailError(err, "SMTP")
      throw new Error(detail)
    }
  }
}

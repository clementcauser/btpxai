import { NextResponse } from "next/server"
import { listEmails, sendEmail } from "@/lib/gmail"
import { findClientByEmailAddress } from "@/lib/email-statuses"
import {
  getAutoAcknowledgmentEnabled,
  hasRecentAcknowledgment,
  logAcknowledgment,
  getLastPollAt,
  setLastPollAt,
} from "@/lib/acknowledgments"
import {
  buildAcknowledgmentSubject,
  buildAcknowledgmentBody,
} from "@/lib/email/acknowledgment"

// Accepted by Vercel cron (Authorization: Bearer CRON_SECRET)
function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+)>/)
  return (match ? match[1] : from).trim().toLowerCase()
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const enabled = await getAutoAcknowledgmentEnabled()
  if (!enabled) {
    return NextResponse.json({ skipped: true, reason: "auto_acknowledgment_disabled" })
  }

  const now = new Date()

  // Use last_poll_at with a 2-minute overlap to avoid missed emails between runs
  const lastPollAt = await getLastPollAt()
  const windowStart = lastPollAt
    ? new Date(lastPollAt.getTime() - 2 * 60 * 1000)
    : new Date(now.getTime() - 10 * 60 * 1000) // fallback: last 10 min on first run

  const epochSeconds = Math.floor(windowStart.getTime() / 1000)

  let emails
  try {
    emails = await listEmails({ maxResults: 20, query: `after:${epochSeconds}` })
  } catch {
    // No Gmail connection configured — skip silently
    await setLastPollAt(now)
    return NextResponse.json({ skipped: true, reason: "gmail_unavailable" })
  }

  await setLastPollAt(now)

  const results: { messageId: string; status: "sent" | "skipped"; reason?: string }[] = []

  for (const email of emails) {
    const emailDate = new Date(email.date)

    // Skip emails older than the window (overlap may include already-processed ones)
    if (emailDate <= windowStart) {
      results.push({ messageId: email.id, status: "skipped", reason: "before_window" })
      continue
    }

    const senderEmail = extractEmailAddress(email.from)

    const alreadySent = await hasRecentAcknowledgment(senderEmail)
    if (alreadySent) {
      results.push({ messageId: email.id, status: "skipped", reason: "recent_ack_exists" })
      continue
    }

    const client = await findClientByEmailAddress(email.from)

    try {
      const subject = buildAcknowledgmentSubject(email.subject)
      const body = buildAcknowledgmentBody(client?.name, email.subject)

      await sendEmail(email.from, subject, body, email.id)
      await logAcknowledgment(email.id, email.threadId, senderEmail, client?.name)

      results.push({ messageId: email.id, status: "sent" })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ messageId: email.id, status: "skipped", reason: `send_error: ${message}` })
    }
  }

  const sent = results.filter((r) => r.status === "sent").length
  return NextResponse.json({ processed: results.length, sent, results })
}

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
import { supabaseService } from "@/lib/supabase/service"

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

type WorkspaceResult = {
  workspaceId: string
  processed: number
  sent: number
  results: { messageId: string; status: "sent" | "skipped"; reason?: string }[]
  skippedReason?: string
}

async function processWorkspace(workspaceId: string): Promise<WorkspaceResult> {
  const enabled = await getAutoAcknowledgmentEnabled(workspaceId)
  if (!enabled) {
    return {
      workspaceId,
      processed: 0,
      sent: 0,
      results: [],
      skippedReason: "auto_acknowledgment_disabled",
    }
  }

  const now = new Date()
  const lastPollAt = await getLastPollAt(workspaceId)
  const windowStart = lastPollAt
    ? new Date(lastPollAt.getTime() - 2 * 60 * 1000)
    : new Date(now.getTime() - 10 * 60 * 1000)

  const epochSeconds = Math.floor(windowStart.getTime() / 1000)

  let emails
  try {
    emails = await listEmails({ maxResults: 20, query: `after:${epochSeconds}` })
  } catch {
    await setLastPollAt(workspaceId, now)
    return {
      workspaceId,
      processed: 0,
      sent: 0,
      results: [],
      skippedReason: "gmail_unavailable",
    }
  }

  await setLastPollAt(workspaceId, now)

  const results: WorkspaceResult["results"] = []

  for (const email of emails) {
    const emailDate = new Date(email.date)

    if (emailDate <= windowStart) {
      results.push({ messageId: email.id, status: "skipped", reason: "before_window" })
      continue
    }

    const senderEmail = extractEmailAddress(email.from)

    const alreadySent = await hasRecentAcknowledgment(workspaceId, senderEmail)
    if (alreadySent) {
      results.push({ messageId: email.id, status: "skipped", reason: "recent_ack_exists" })
      continue
    }

    const client = await findClientByEmailAddress(workspaceId, email.from)

    try {
      const subject = buildAcknowledgmentSubject(email.subject)
      const body = buildAcknowledgmentBody(client?.name, email.subject)

      await sendEmail(email.from, subject, body, email.id)
      await logAcknowledgment(workspaceId, email.id, email.threadId, senderEmail, client?.name)

      results.push({ messageId: email.id, status: "sent" })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ messageId: email.id, status: "skipped", reason: `send_error: ${message}` })
    }
  }

  const sent = results.filter((r) => r.status === "sent").length
  return { workspaceId, processed: results.length, sent, results }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: workspaces, error } = await supabaseService.from("workspaces").select("id")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const perWorkspace: WorkspaceResult[] = []
  for (const ws of workspaces ?? []) {
    perWorkspace.push(await processWorkspace(ws.id))
  }

  const totalSent = perWorkspace.reduce((s, w) => s + w.sent, 0)
  const totalProcessed = perWorkspace.reduce((s, w) => s + w.processed, 0)
  return NextResponse.json({
    workspaces: perWorkspace.length,
    processed: totalProcessed,
    sent: totalSent,
    perWorkspace,
  })
}

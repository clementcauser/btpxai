import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getQuotesDueForReminder, logReminder } from "@/lib/reminders"
import { buildReminderSubject, buildReminderHtml } from "@/lib/email/reminder"
import { env } from "@/lib/env"
import type { ReminderType } from "@/types"

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const types: ReminderType[] = ["quote_j7", "quote_j14", "payment"]
  const results: {
    type: ReminderType
    quoteId: string
    status: "sent" | "skipped"
    reason?: string
  }[] = []

  for (const type of types) {
    let quotes
    try {
      quotes = await getQuotesDueForReminder(type)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({
        type,
        quoteId: "*",
        status: "skipped",
        reason: `fetch_error: ${message}`,
      })
      continue
    }

    for (const quote of quotes) {
      const clientEmail = quote.project.client.email
      if (!clientEmail) {
        results.push({
          type,
          quoteId: quote.id,
          status: "skipped",
          reason: "no_client_email",
        })
        continue
      }

      try {
        await resend.emails.send({
          from: "BTP × AI Métallerie <devis@btpxai.fr>",
          to: [clientEmail],
          subject: buildReminderSubject(quote, type),
          html: buildReminderHtml(quote, type),
        })

        await logReminder(quote.id, type, clientEmail)
        results.push({ type, quoteId: quote.id, status: "sent" })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          type,
          quoteId: quote.id,
          status: "skipped",
          reason: `send_error: ${message}`,
        })
      }
    }
  }

  const sent = results.filter((r) => r.status === "sent").length
  return NextResponse.json({ processed: results.length, sent, results })
}

import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getWeeklyReportData, getWeeklyReportRecipients } from "@/lib/weekly-report"
import { generateWeeklyReportNarrative } from "@/lib/agents/weekly-report"
import { buildWeeklyReportHtml, buildWeeklyReportSubject } from "@/lib/email/weekly-report"
import { env } from "@/lib/env"

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

  let data
  try {
    data = await getWeeklyReportData()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `data_fetch_error: ${message}` }, { status: 500 })
  }

  const recipients = await getWeeklyReportRecipients()
  if (recipients.length === 0) {
    return NextResponse.json({ status: "skipped", reason: "no_recipients_configured" })
  }

  let narrative
  try {
    narrative = await generateWeeklyReportNarrative(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `narrative_error: ${message}` }, { status: 500 })
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY)
    await resend.emails.send({
      from: "BTP × AI Métallerie <rapport@btpxai.fr>",
      to: recipients,
      subject: buildWeeklyReportSubject(data.weekRange.start),
      html: buildWeeklyReportHtml(data, narrative),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `send_error: ${message}` }, { status: 500 })
  }

  return NextResponse.json({
    status: "sent",
    recipients: recipients.length,
    weekRange: data.weekRange,
  })
}

import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getWeeklyReportData, getWeeklyReportRecipients } from "@/lib/weekly-report"
import { generateWeeklyReportNarrative } from "@/lib/agents/weekly-report"
import { buildWeeklyReportHtml, buildWeeklyReportSubject } from "@/lib/email/weekly-report"
import { env } from "@/lib/env"
import { supabaseService } from "@/lib/supabase/service"
import { getCompanyInfo } from "@/lib/settings"

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

type WorkspaceResult = {
  workspaceId: string
  status: "sent" | "skipped" | "error"
  reason?: string
  recipients?: number
}

async function processWorkspace(workspaceId: string): Promise<WorkspaceResult> {
  const company = await getCompanyInfo(workspaceId)
  let data
  try {
    data = await getWeeklyReportData(workspaceId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { workspaceId, status: "error", reason: `data_fetch_error: ${message}` }
  }

  const recipients = await getWeeklyReportRecipients(workspaceId)
  if (recipients.length === 0) {
    return { workspaceId, status: "skipped", reason: "no_recipients_configured" }
  }

  let narrative
  try {
    narrative = await generateWeeklyReportNarrative(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { workspaceId, status: "error", reason: `narrative_error: ${message}` }
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY)
    await resend.emails.send({
      from: `${company.name || "Rapport"} <rapport@btpxai.fr>`,
      to: recipients,
      subject: buildWeeklyReportSubject(data.weekRange.start),
      html: buildWeeklyReportHtml(data, narrative, company),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { workspaceId, status: "error", reason: `send_error: ${message}` }
  }

  return { workspaceId, status: "sent", recipients: recipients.length }
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

  return NextResponse.json({ workspaces: perWorkspace.length, perWorkspace })
}

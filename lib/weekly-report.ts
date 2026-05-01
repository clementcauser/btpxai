import { supabaseService } from "@/lib/supabase/service"
import type { SupabaseClient } from "@supabase/supabase-js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

export type WeekRange = { start: string; end: string }

export type WeeklyQuoteStats = {
  sent: number
  accepted: number
  rejected: number
  caRealiseHT: number
}

export type WeeklyProjectStats = {
  completedTotal: number
  inProgressTotal: number
}

export type WeeklyAttentionPoints = {
  pendingQuotes: number
  openAlerts: number
  pendingMaterials: number
  unprocessedEmails: number
}

export type WeeklyReportData = {
  weekRange: WeekRange
  quotes: WeeklyQuoteStats
  projects: WeeklyProjectStats
  attentionPoints: WeeklyAttentionPoints
}

export function getLastWeekRange(): WeekRange {
  const now = new Date()
  const end = new Date(now)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function getWeeklyQuoteStats(
  supabase: AnyClient,
  range: WeekRange
): Promise<WeeklyQuoteStats> {
  const { data, error } = await supabase
    .from("quotes")
    .select("status, total_ht")
    .gte("sent_at", range.start)
    .lt("sent_at", range.end)

  if (error) throw error

  const rows = (data ?? []) as { status: string; total_ht: number }[]
  const sent = rows.length
  const accepted = rows.filter((r) => r.status === "accepted").length
  const rejected = rows.filter((r) => r.status === "rejected").length
  const caRealiseHT =
    Math.round(
      rows
        .filter((r) => r.status === "accepted")
        .reduce((sum, r) => sum + (r.total_ht ?? 0), 0) * 100
    ) / 100

  return { sent, accepted, rejected, caRealiseHT }
}

export async function getWeeklyProjectStats(supabase: AnyClient): Promise<WeeklyProjectStats> {
  const [{ count: completedTotal }, { count: inProgressTotal }] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
  ])

  return {
    completedTotal: completedTotal ?? 0,
    inProgressTotal: inProgressTotal ?? 0,
  }
}

export async function getWeeklyAttentionPoints(
  supabase: AnyClient,
  weekStart: string
): Promise<WeeklyAttentionPoints> {
  const [
    { count: pendingQuotes },
    { count: openAlerts },
    { count: pendingMaterials },
    { count: unprocessedEmails },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .lt("sent_at", weekStart),
    supabase
      .from("alertes_terrain")
      .select("id", { count: "exact", head: true })
      .in("status", ["ouvert", "pris_en_charge"]),
    supabase
      .from("materiaux_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_statuses")
      .select("id", { count: "exact", head: true })
      .eq("status", "a_traiter"),
  ])

  return {
    pendingQuotes: pendingQuotes ?? 0,
    openAlerts: openAlerts ?? 0,
    pendingMaterials: pendingMaterials ?? 0,
    unprocessedEmails: unprocessedEmails ?? 0,
  }
}

export async function getWeeklyReportData(): Promise<WeeklyReportData> {
  const weekRange = getLastWeekRange()

  const [quotes, projects, attentionPoints] = await Promise.all([
    getWeeklyQuoteStats(supabaseService, weekRange),
    getWeeklyProjectStats(supabaseService),
    getWeeklyAttentionPoints(supabaseService, weekRange.start),
  ])

  return { weekRange, quotes, projects, attentionPoints }
}

export async function getWeeklyReportRecipients(): Promise<string[]> {
  const { data } = await supabaseService
    .from("app_settings")
    .select("value")
    .eq("key", "weekly_report_recipients")
    .single()

  if (!data?.value) return []
  try {
    const parsed = JSON.parse(data.value) as unknown
    if (Array.isArray(parsed)) return parsed.filter((e) => typeof e === "string")
    return []
  } catch {
    return []
  }
}

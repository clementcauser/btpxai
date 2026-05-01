import type { SupabaseClient } from "@supabase/supabase-js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

export type DashboardMetrics = {
  pendingQuotes: number
  activeProjects: number
  unprocessedEmails: number
  weeklyRevenue: number
  pendingMaterials: number
  openAlerts: number
}

export function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function getPendingQuotesCount(supabase: AnyClient): Promise<number> {
  const { count, error } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")

  if (error) return 0
  return count ?? 0
}

export async function getActiveProjectsCount(supabase: AnyClient): Promise<number> {
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_progress")

  if (error) return 0
  return count ?? 0
}

export async function getUnprocessedEmailsCount(supabase: AnyClient): Promise<number> {
  const { count, error } = await supabase
    .from("email_statuses")
    .select("id", { count: "exact", head: true })
    .eq("status", "a_traiter")

  if (error) return 0
  return count ?? 0
}

export async function getWeeklyRevenue(supabase: AnyClient): Promise<number> {
  const weekStart = getWeekStart().toISOString()
  const { data, error } = await supabase
    .from("quotes")
    .select("total_ht")
    .eq("status", "accepted")
    .gte("created_at", weekStart)

  if (error || !data) return 0
  return (
    Math.round(
      (data as { total_ht: number }[]).reduce((sum, q) => sum + (q.total_ht ?? 0), 0) * 100
    ) / 100
  )
}

export async function getPendingMaterialsCount(supabase: AnyClient): Promise<number> {
  const { count, error } = await supabase
    .from("materiaux_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  if (error) return 0
  return count ?? 0
}

export async function getOpenAlertsCount(supabase: AnyClient): Promise<number> {
  const { count, error } = await supabase
    .from("alertes_terrain")
    .select("id", { count: "exact", head: true })
    .in("status", ["ouvert", "pris_en_charge"])

  if (error) return 0
  return count ?? 0
}

export async function getDashboardMetrics(supabase: AnyClient): Promise<DashboardMetrics> {
  const [
    pendingQuotes,
    activeProjects,
    unprocessedEmails,
    weeklyRevenue,
    pendingMaterials,
    openAlerts,
  ] = await Promise.all([
    getPendingQuotesCount(supabase),
    getActiveProjectsCount(supabase),
    getUnprocessedEmailsCount(supabase),
    getWeeklyRevenue(supabase),
    getPendingMaterialsCount(supabase),
    getOpenAlertsCount(supabase),
  ])

  return {
    pendingQuotes,
    activeProjects,
    unprocessedEmails,
    weeklyRevenue,
    pendingMaterials,
    openAlerts,
  }
}

import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match?.[1] ?? null
}

export async function getSpreadsheetUrl(workspaceId: string): Promise<string | null> {
  const { data } = await supabaseService
    .from("workspace_settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "sheets_spreadsheet_url")
    .single()
  return data?.value ?? null
}

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

export async function getValidAccessToken(): Promise<string> {
  const { data: conn } = await supabaseService
    .from("gmail_connections")
    .select("*")
    .limit(1)
    .single()

  if (!conn) throw new Error("Aucune connexion Google configurée. Connectez votre compte Gmail d'abord.")

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

  if (!res.ok) throw new Error("Échec du refresh token Google")

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

async function clearSheet(token: string, spreadsheetId: string, sheetName: string): Promise<void> {
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Erreur Sheets API (clear ${sheetName}): ${body}`)
  }
}

async function writeSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number | null)[][]
): Promise<void> {
  const range = `${sheetName}!A1`
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ range, majorDimension: "ROWS", values: rows }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Erreur Sheets API (write ${sheetName}): ${body}`)
  }
}

export type SyncResult = {
  sheet: string
  status: "success" | "error"
  rowCount?: number
  error?: string
}

function formatDate(isoString: string | null): string {
  if (!isoString) return ""
  return new Date(isoString).toLocaleDateString("fr-FR")
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return ""
  return amount.toFixed(2)
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  planned: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
}

type QuoteRow = {
  reference: string | null
  status: string
  total_ht: number | null
  created_at: string
  sent_at: string | null
  project: { title: string; client: { name: string } | null } | null
}

type ProjectRow = {
  title: string
  status: string
  created_at: string
  client: { name: string } | null
}

type MonthlyQuote = {
  status: string
  total_ht: number | null
  created_at: string
}

export async function syncQuotes(token: string, spreadsheetId: string): Promise<SyncResult> {
  const { data: quotes, error } = await supabaseService
    .from("quotes")
    .select("reference, status, total_ht, created_at, sent_at, project:projects(title, client:clients(name))")
    .order("created_at", { ascending: false })

  if (error) return { sheet: "Devis", status: "error", error: error.message }

  const header = ["Référence", "Client", "Montant HT (€)", "Statut", "Date création", "Date envoi"]
  const rows = (quotes as unknown as QuoteRow[]).map((q) => [
    q.reference ?? "",
    q.project?.client?.name ?? "",
    formatAmount(q.total_ht),
    STATUS_LABELS[q.status] ?? q.status,
    formatDate(q.created_at),
    formatDate(q.sent_at),
  ])

  try {
    await clearSheet(token, spreadsheetId, "Devis")
    await writeSheet(token, spreadsheetId, "Devis", [header, ...rows])
    return { sheet: "Devis", status: "success", rowCount: rows.length }
  } catch (err) {
    return { sheet: "Devis", status: "error", error: err instanceof Error ? err.message : String(err) }
  }
}

export async function syncProjects(token: string, spreadsheetId: string): Promise<SyncResult> {
  const { data: projects, error } = await supabaseService
    .from("projects")
    .select("title, status, created_at, client:clients(name)")
    .in("status", ["planned", "in_progress"])
    .order("created_at", { ascending: false })

  if (error) return { sheet: "Projets", status: "error", error: error.message }

  const header = ["Titre", "Client", "Statut", "Date création"]
  const rows = (projects as unknown as ProjectRow[]).map((p) => [
    p.title,
    p.client?.name ?? "",
    STATUS_LABELS[p.status] ?? p.status,
    formatDate(p.created_at),
  ])

  try {
    await clearSheet(token, spreadsheetId, "Projets")
    await writeSheet(token, spreadsheetId, "Projets", [header, ...rows])
    return { sheet: "Projets", status: "success", rowCount: rows.length }
  } catch (err) {
    return { sheet: "Projets", status: "error", error: err instanceof Error ? err.message : String(err) }
  }
}

export async function syncMonthlyRevenue(token: string, spreadsheetId: string): Promise<SyncResult> {
  const { data: quotes, error } = await supabaseService
    .from("quotes")
    .select("status, total_ht, created_at")
    .order("created_at", { ascending: false })

  if (error) return { sheet: "CA Mensuel", status: "error", error: error.message }

  const byMonth = new Map<string, { ca: number; accepted: number; sent: number }>()

  for (const q of quotes as MonthlyQuote[]) {
    const d = new Date(q.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const current = byMonth.get(key) ?? { ca: 0, accepted: 0, sent: 0 }

    if (q.status === "accepted") {
      current.ca += q.total_ht ?? 0
      current.accepted += 1
    } else if (q.status === "sent") {
      current.sent += 1
    }

    byMonth.set(key, current)
  }

  const sortedKeys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a)).slice(0, 12)
  const header = ["Mois", "CA Réalisé HT (€)", "Nb devis acceptés", "Nb devis envoyés"]
  const rows = sortedKeys.map((key) => {
    const [year, month] = key.split("-")
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    })
    const data = byMonth.get(key)!
    return [label, data.ca.toFixed(2), data.accepted, data.sent]
  })

  try {
    await clearSheet(token, spreadsheetId, "CA Mensuel")
    await writeSheet(token, spreadsheetId, "CA Mensuel", [header, ...rows])
    return { sheet: "CA Mensuel", status: "success", rowCount: rows.length }
  } catch (err) {
    return { sheet: "CA Mensuel", status: "error", error: err instanceof Error ? err.message : String(err) }
  }
}

export async function getLastSyncAt(workspaceId: string): Promise<string | null> {
  const { data } = await supabaseService
    .from("workspace_settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "sheets_last_sync_at")
    .single()

  return data?.value ?? null
}

async function setLastSyncAt(workspaceId: string, date: Date): Promise<void> {
  await supabaseService.from("workspace_settings").upsert(
    {
      workspace_id: workspaceId,
      key: "sheets_last_sync_at",
      value: date.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,key" }
  )
}

export async function syncAllToSheets(workspaceId: string): Promise<{
  results: SyncResult[]
  syncedAt: string
  hasError: boolean
}> {
  const spreadsheetUrl = await getSpreadsheetUrl(workspaceId)
  if (!spreadsheetUrl) {
    throw new Error("Aucune URL Google Sheets configurée. Renseignez-la dans les paramètres.")
  }
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
  if (!spreadsheetId) {
    throw new Error("URL Google Sheets invalide. Vérifiez le format dans les paramètres.")
  }
  const token = await getValidAccessToken()

  const [quotesResult, projectsResult, revenueResult] = await Promise.all([
    syncQuotes(token, spreadsheetId),
    syncProjects(token, spreadsheetId),
    syncMonthlyRevenue(token, spreadsheetId),
  ])

  const results = [quotesResult, projectsResult, revenueResult]
  const hasError = results.some((r) => r.status === "error")
  const syncedAt = new Date().toISOString()

  if (!hasError) {
    await setLastSyncAt(workspaceId, new Date())
  }

  return { results, syncedAt, hasError }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, createClient } from "@/lib/supabase/server"
import { generateClientSummary } from "@/lib/agents/email"

export const maxDuration = 30

const requestSchema = z.object({
  clientId: z.string().uuid(),
  currentEmailSubject: z.string().optional(),
  currentEmailSnippet: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { clientId, currentEmailSubject, currentEmailSnippet } = parsed.data

  try {
    const supabase = await createClient()

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, email, phone, address, created_at")
      .eq("id", clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const [{ data: emailStatuses }, { data: projects }] = await Promise.all([
      supabase
        .from("email_statuses")
        .select("status, category, created_at, updated_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("projects")
        .select("id, title, quotes(id, reference, status, total_ht, created_at, sent_at)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ])

    type QuoteRow = {
      id: string
      reference: string | null
      status: string
      total_ht: number | null
      created_at: string
      sent_at: string | null
    }
    type ProjectRow = { id: string; title: string; quotes: QuoteRow[] | null }
    type EmailStatusRow = {
      status: string
      category: string | null
      created_at: string
      updated_at: string
    }

    const emailHistory: EmailStatusRow[] = emailStatuses ?? []
    const allQuotes = (projects as ProjectRow[] | null ?? []).flatMap(
      (p: ProjectRow) =>
        (p.quotes ?? []).map((q: QuoteRow) => ({ ...q, projectTitle: p.title }))
    )

    const clientAge = formatAge(client.created_at)
    const emailCategories = [
      ...new Set(
        emailHistory
          .map((e: EmailStatusRow) => e.category)
          .filter((c): c is string => c !== null)
      ),
    ]
    const latestEmailDate = emailHistory[0]?.updated_at
    const acceptedRevenue = allQuotes
      .filter((q) => q.status === "accepted" || q.status === "signed")
      .reduce((sum: number, q) => sum + (q.total_ht ?? 0), 0)

    const lines: string[] = [
      `Client : ${client.name}`,
      `Email : ${client.email ?? "non renseigné"}`,
      `Téléphone : ${client.phone ?? "non renseigné"}`,
      `Client depuis : ${clientAge}`,
      "",
      `Historique emails : ${emailHistory.length} email(s) traité(s)`,
    ]

    if (emailCategories.length > 0) {
      lines.push(`Catégories : ${emailCategories.join(", ")}`)
    }
    if (latestEmailDate) {
      lines.push(`Dernier contact : ${formatRelativeDate(latestEmailDate)}`)
    }

    lines.push("", `Devis : ${allQuotes.length} devis au total`)

    if (allQuotes.length > 0) {
      const recent = allQuotes.slice(0, 3).map(
        (q) =>
          `${q.reference ?? q.projectTitle} (${q.status}${q.total_ht ? `, ${q.total_ht}€ HT` : ""})`
      )
      lines.push(`Récents : ${recent.join(", ")}`)
    }

    if (acceptedRevenue > 0) {
      lines.push(`CA accepté : ${acceptedRevenue}€ HT`)
    }

    if (currentEmailSubject) {
      lines.push("", `Email consulté : "${currentEmailSubject}"`)
      if (currentEmailSnippet) {
        lines.push(`Aperçu : ${currentEmailSnippet.slice(0, 200)}`)
      }
    }

    const context = lines.join("\n")
    const result = await generateClientSummary(context, req.signal)
    return NextResponse.json(result)
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")
    console.error("Client summary error:", err)
    return NextResponse.json(
      {
        error: isTimeout
          ? "Délai de génération dépassé (30s)"
          : "Erreur lors de la génération du résumé",
      },
      { status: isTimeout ? 504 : 502 }
    )
  }
}

function formatAge(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const months =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  if (months < 1) return "moins d'un mois"
  if (months === 1) return "1 mois"
  if (months < 12) return `${months} mois`
  const years = Math.floor(months / 12)
  return years === 1 ? "1 an" : `${years} ans`
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diffDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return "hier"
  if (diffDays < 7) return `il y a ${diffDays} jours`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine(s)`
  if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`
  return `il y a ${Math.floor(diffDays / 365)} an(s)`
}

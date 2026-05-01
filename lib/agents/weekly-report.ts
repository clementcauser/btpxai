import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { WeeklyReportData } from "@/lib/weekly-report"

export const weeklyReportNarrativeSchema = z.object({
  summary: z.string().min(1),
  highlights: z.array(z.string()),
  attentionItems: z.array(z.string()),
})
export type WeeklyReportNarrative = z.infer<typeof weeklyReportNarrativeSchema>

const aiNarrativeSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  attentionItems: z.array(z.string()),
})

const SYSTEM_PROMPT = `Tu es l'assistant de gestion d'une PME familiale de métallerie et serrurerie. Tu génères le rapport hebdomadaire de l'activité de la semaine passée, destiné au gérant et à l'équipe bureau.

Règles :
- summary : 2-3 phrases résumant l'activité globale de la semaine, en français
- highlights : 2-4 points positifs ou faits marquants de la semaine (ex : CA réalisé, devis acceptés, chantiers actifs)
- attentionItems : 0-4 points nécessitant une action (ex : devis en attente de réponse, alertes terrain ouvertes) — liste vide si aucun point d'attention
- Ton professionnel, factuel, encourageant pour une entreprise familiale
- N'invente aucun chiffre, utilise uniquement les données fournies`

function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export async function generateWeeklyReportNarrative(
  data: WeeklyReportData,
  signal?: AbortSignal
): Promise<WeeklyReportNarrative> {
  const timeoutSignal = AbortSignal.timeout(30_000)
  const abortSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

  const weekEndDisplay = new Date(new Date(data.weekRange.end).getTime() - 1)
  const prompt = `Données de la semaine du ${fmtDate(data.weekRange.start)} au ${fmtDate(weekEndDisplay.toISOString())} :

DEVIS :
- Devis envoyés : ${data.quotes.sent}
- Devis acceptés : ${data.quotes.accepted}
- Devis refusés : ${data.quotes.rejected}
- CA réalisé (HT) : ${fmtEur(data.quotes.caRealiseHT)}

CHANTIERS :
- Chantiers en cours : ${data.projects.inProgressTotal}
- Chantiers terminés (total cumulé) : ${data.projects.completedTotal}

POINTS D'ATTENTION :
- Devis anciens en attente de réponse : ${data.attentionPoints.pendingQuotes}
- Alertes terrain ouvertes : ${data.attentionPoints.openAlerts}
- Demandes matériaux en attente : ${data.attentionPoints.pendingMaterials}
- Emails non traités : ${data.attentionPoints.unprocessedEmails}

Génère le rapport hebdomadaire.`

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: aiNarrativeSchema,
    system: SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 512,
    abortSignal,
  })

  return weeklyReportNarrativeSchema.parse(object)
}

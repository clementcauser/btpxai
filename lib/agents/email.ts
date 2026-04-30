import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

export const clientSummarySchema = z.object({
  summary: z.string(),
})
export type ClientSummary = z.infer<typeof clientSummarySchema>

export const emailCategorySchema = z.enum([
  "demande_devis",
  "suivi_commande",
  "question",
  "autre",
])
export type EmailCategory = z.infer<typeof emailCategorySchema>

// Full schemas with business validation — used for testing and post-generation validation.
export const emailClassificationSchema = z.object({
  category: emailCategorySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
})
export type EmailClassification = z.infer<typeof emailClassificationSchema>

export const emailDraftSchema = z.object({
  draft: z.string().min(1),
})
export type EmailDraft = z.infer<typeof emailDraftSchema>

// Stripped schemas for Anthropic's output_config — numeric constraints not supported.
const aiClassificationSchema = z.object({
  category: emailCategorySchema,
  confidence: z.number(),
  reasoning: z.string(),
})

const aiDraftSchema = z.object({
  draft: z.string(),
})

const CLASSIFY_SYSTEM_PROMPT = `Tu es un assistant pour une PME de métallerie et serrurerie. Ta tâche est de classifier les emails entrants reçus par l'entreprise.

Catégories disponibles :
- demande_devis : le client demande un devis, une estimation de prix, ou une offre commerciale pour des travaux
- suivi_commande : le client s'enquiert de l'avancement d'une commande, d'un chantier en cours, ou de délais de livraison
- question : le client pose une question générale (technique, administrative, horaires d'ouverture, etc.)
- autre : tout ce qui ne correspond pas aux catégories précédentes (spam, newsletter, accusé de réception, etc.)

Retourne un objet JSON avec :
- category : la catégorie choisie parmi les 4 possibilités
- confidence : un score entre 0.0 et 1.0 indiquant ta certitude
- reasoning : une courte explication en français (1-2 phrases maximum)`

const DRAFT_SYSTEM_PROMPT = `Tu es l'assistant administratif d'une PME familiale de métallerie et serrurerie en France. Tu rédiges des réponses professionnelles, courtoises et concises aux emails des clients.

Règles de rédaction :
- Rédige toujours en français
- Ton professionnel mais chaleureux, typique d'une entreprise familiale
- Signe avec "Cordialement,\nL'équipe BTP"
- Pour les demandes de devis : remercie le client, indique qu'un devis sera établi et propose de fournir des détails supplémentaires si nécessaire
- Pour les suivis de commande : rassure le client, confirme que le dossier est bien suivi
- Pour les questions : réponds de manière précise et utile
- Pour les autres cas : réponds courtoisement et oriente si nécessaire
- Garde la réponse concise (2-4 paragraphes maximum)
- N'invente JAMAIS de dates précises, de prix ou de noms de techniciens`

export async function classifyEmail(
  subject: string,
  body: string,
  signal?: AbortSignal
): Promise<EmailClassification> {
  const timeoutSignal = AbortSignal.timeout(30_000)
  const abortSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: aiClassificationSchema,
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt: `Objet : ${subject}\n\nCorps du message :\n${body}`,
    maxOutputTokens: 256,
    abortSignal,
  })

  return emailClassificationSchema.parse(object)
}

const CLIENT_SUMMARY_SYSTEM_PROMPT = `Tu es l'assistant de gestion commerciale d'une PME familiale de métallerie et serrurerie. Tu génères des résumés contextuels concis sur les clients pour aider l'équipe bureau lors de la consultation des emails.

Règles :
- Résumé en 3-4 lignes maximum, en français
- Inclure les informations utiles : ancienneté, projets/devis, historique email, points d'attention
- Ton factuel et professionnel, sans redondance ni répétition
- Si peu d'historique disponible, l'indiquer brièvement
- Ne jamais inventer d'informations absentes des données fournies`

export async function generateClientSummary(
  context: string,
  signal?: AbortSignal
): Promise<ClientSummary> {
  const timeoutSignal = AbortSignal.timeout(30_000)
  const abortSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: z.object({ summary: z.string() }),
    system: CLIENT_SUMMARY_SYSTEM_PROMPT,
    prompt: context,
    maxOutputTokens: 256,
    abortSignal,
  })

  return clientSummarySchema.parse(object)
}

export async function draftEmailReply(
  subject: string,
  body: string,
  category: EmailCategory,
  clientName?: string,
  signal?: AbortSignal
): Promise<EmailDraft> {
  const timeoutSignal = AbortSignal.timeout(30_000)
  const abortSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

  const categoryLabels: Record<EmailCategory, string> = {
    demande_devis: "demande de devis",
    suivi_commande: "suivi de commande",
    question: "question générale",
    autre: "autre",
  }

  const clientContext = clientName ? `\nClient connu : ${clientName}` : ""
  const prompt = `Type d'email : ${categoryLabels[category]}${clientContext}

Email reçu :
Objet : ${subject}

${body}

Rédige une réponse adaptée à cet email.`

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: aiDraftSchema,
    system: DRAFT_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 512,
    abortSignal,
  })

  return emailDraftSchema.parse(object)
}

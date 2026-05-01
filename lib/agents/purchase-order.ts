import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

export const SUPPORTED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const

export type SupportedMimeType = (typeof SUPPORTED_ATTACHMENT_MIME_TYPES)[number]

export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return (SUPPORTED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType)
}

export const purchaseOrderItemSchema = z.object({
  label: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unit_price: z.number().nonnegative().nullable(),
})
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>

export const purchaseOrderExtractionSchema = z.object({
  client_name: z.string().nullable(),
  client_email: z.string().nullable(),
  client_phone: z.string().nullable(),
  client_address: z.string().nullable(),
  order_reference: z.string().nullable(),
  order_date: z.string().nullable(),
  delivery_deadline: z.string().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1),
  total_ht: z.number().nonnegative().nullable(),
  notes: z.string().nullable(),
  confidence: z.number().min(0).max(1),
})
export type PurchaseOrderExtraction = z.infer<typeof purchaseOrderExtractionSchema>

// Stripped schema for AI — no min/max constraints that Anthropic's structured output rejects.
const aiPurchaseOrderItemSchema = z.object({
  label: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number().nullable(),
})

const aiPurchaseOrderSchema = z.object({
  client_name: z.string().nullable(),
  client_email: z.string().nullable(),
  client_phone: z.string().nullable(),
  client_address: z.string().nullable(),
  order_reference: z.string().nullable(),
  order_date: z.string().nullable(),
  delivery_deadline: z.string().nullable(),
  items: z.array(aiPurchaseOrderItemSchema),
  total_ht: z.number().nullable(),
  notes: z.string().nullable(),
  confidence: z.number(),
})

const EXTRACT_SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données à partir de bons de commande reçus par une entreprise de métallerie et serrurerie.

À partir du document fourni (PDF ou image), extrais les informations suivantes avec précision :

- Informations client : nom, email, téléphone, adresse complète
- Référence de commande (numéro BC, bon de commande, référence interne du client)
- Date de commande (format ISO 8601 : YYYY-MM-DD si possible)
- Délai de livraison ou date souhaitée (format ISO 8601 si possible)
- Lignes de commande : désignation exacte, quantité, unité de mesure (ml, m², kg, u, h, forfait…), prix unitaire HT si présent
- Montant total HT si présent
- Notes, remarques particulières ou conditions spéciales

Règles :
- Si une information est absente ou illisible, retourne null pour ce champ
- Les prix doivent être en euros HT (hors taxes)
- Retourne un score de confiance globale entre 0.0 et 1.0 (1.0 = document parfaitement lisible et complet)
- Si le document n'est pas un bon de commande, retourne des items vides et confidence proche de 0`

export async function extractPurchaseOrder(
  data: Buffer,
  mimeType: SupportedMimeType,
  signal?: AbortSignal
): Promise<PurchaseOrderExtraction> {
  const timeoutSignal = AbortSignal.timeout(30_000)
  const abortSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

  const fileContent =
    mimeType === "application/pdf"
      ? ({ type: "file" as const, data, mediaType: "application/pdf" as const })
      : ({ type: "image" as const, image: data, mimeType })

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: aiPurchaseOrderSchema,
    system: EXTRACT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          fileContent,
          { type: "text" as const, text: "Extrais les données de ce bon de commande." },
        ],
      },
    ],
    maxOutputTokens: 1024,
    abortSignal,
  })

  return purchaseOrderExtractionSchema.parse(object)
}

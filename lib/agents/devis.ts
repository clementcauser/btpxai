import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

// Full schema with business validation — used for testing and post-generation validation.
export const generatedQuoteItemSchema = z.object({
  label: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unit_price: z.number().nonnegative(),
})

export const quoteGenerationOutputSchema = z.object({
  items: z.array(generatedQuoteItemSchema).min(1),
  notes: z.string(),
})

export type GeneratedQuoteItem = z.infer<typeof generatedQuoteItemSchema>
export type QuoteGenerationOutput = z.infer<typeof quoteGenerationOutputSchema>

// Stripped schema for Anthropic's output_config — numeric/string/array constraints
// are not supported and cause a 400 error.
const aiItemSchema = z.object({
  label: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number(),
})

const aiOutputSchema = z.object({
  items: z.array(aiItemSchema),
  notes: z.string(),
})

const SYSTEM_PROMPT = `Tu es un expert en métallerie et serrurerie industrielle. Tu aides une PME familiale française à générer des devis précis pour ses clients.

Lorsque tu reçois un brief décrivant des travaux de métallerie, décompose-les en lignes de devis claires et détaillées.

Règles de génération :
- Sépare toujours la fourniture matériaux de la main d'œuvre
- Unités standards : ml (mètre linéaire), m² (mètre carré), u (unité), h (heure), kg (kilogramme), forfait
- Prix réalistes pour le marché français 2025 :
  • Acier S235 profilé : 45–65 €/ml selon section
  • Acier S235 en tôle : 3–5 €/kg
  • Inox 304 : +40 % vs acier
  • Main d'œuvre métallerie/soudure : 50–65 €/h
  • Galvanisation à chaud : 2–5 €/kg
  • Peinture époxy/anticorrosion : 15–25 €/m²
  • Traçage, meulage, finitions : inclure en h ou forfait
- Si des matériaux spécifiques sont mentionnés dans le brief, les inclure explicitement
- Ne génère pas de TVA ni de remise (gérées ailleurs)
- La note finale doit indiquer les conditions tarifaires (cours de l'acier, validité du devis)`

export async function generateQuoteItems(
  brief: string,
  signal?: AbortSignal
): Promise<QuoteGenerationOutput> {
  const timeoutSignal = AbortSignal.timeout(30_000)
  const abortSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: aiOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: brief,
    maxOutputTokens: 2048,
    abortSignal,
  })

  // Validate the AI output against the strict business schema before returning.
  return quoteGenerationOutputSchema.parse(object)
}

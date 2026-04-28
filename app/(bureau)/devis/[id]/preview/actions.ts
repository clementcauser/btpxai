"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  updateQuote,
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
} from "@/lib/quotes"

const ItemInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Désignation requise"),
  quantity: z.number().positive("Quantité positive requise"),
  unit_price: z.number().nonnegative("Prix unitaire positif ou nul"),
  unit: z.string().nullable().optional(),
})

const SaveInputSchema = z.object({
  quoteId: z.string().uuid(),
  items: z.array(ItemInputSchema).min(1, "Au moins une ligne requise"),
  notes: z.string().nullable().optional(),
  tva_rate: z.number().nonnegative().max(100),
  validity_days: z.number().int().positive(),
  deletedItemIds: z.array(z.string()),
})

export type SaveQuoteInput = z.infer<typeof SaveInputSchema>

export async function saveQuoteAction(
  input: SaveQuoteInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = SaveInputSchema.parse(input)
    const supabase = await createClient()

    for (const id of parsed.deletedItemIds) {
      await deleteQuoteItem(supabase, id, parsed.quoteId)
    }

    for (const item of parsed.items) {
      if (item.id) {
        await updateQuoteItem(supabase, item.id, parsed.quoteId, {
          label: item.label,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit ?? null,
        })
      } else {
        await addQuoteItem(supabase, {
          quote_id: parsed.quoteId,
          label: item.label,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit ?? null,
        })
      }
    }

    await updateQuote(supabase, parsed.quoteId, {
      notes: parsed.notes ?? null,
      tva_rate: parsed.tva_rate,
      validity_days: parsed.validity_days,
    })

    revalidatePath(`/devis/${parsed.quoteId}/preview`)
    return { success: true }
  } catch (err) {
    console.error("[saveQuoteAction]", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    }
  }
}


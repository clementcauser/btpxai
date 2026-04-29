import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { generateQuoteItems } from "@/lib/agents/devis"
import { addQuoteItem } from "@/lib/quotes"

// Vercel max function duration (seconds)
export const maxDuration = 30

const generateSchema = z.object({
  quote_id: z.string().uuid("ID de devis invalide"),
  brief: z.string().min(10, "Brief trop court (10 caractères minimum)"),
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
    return NextResponse.json(
      { error: "Corps de requête invalide" },
      { status: 400 }
    )
  }

  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { quote_id, brief } = parsed.data

  let generated
  try {
    generated = await generateQuoteItems(brief, req.signal)
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError")
    console.error("AI generation error:", err)
    return NextResponse.json(
      {
        error: isTimeout
          ? "Délai de génération dépassé (30s)"
          : "Erreur lors de la génération IA",
      },
      { status: isTimeout ? 504 : 502 }
    )
  }

  const insertedItems = []

  try {
    for (const item of generated.items) {
      const inserted = await addQuoteItem(supabaseService, {
        quote_id,
        label: item.label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit,
      })
      insertedItems.push(inserted)
    }
  } catch (err) {
    console.error("DB insert error:", err)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement des lignes de devis" },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { items: insertedItems, notes: generated.notes },
    { status: 201 }
  )
}

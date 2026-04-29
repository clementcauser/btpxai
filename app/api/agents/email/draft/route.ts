import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { draftEmailReply, emailCategorySchema } from "@/lib/agents/email"

export const maxDuration = 30

const draftSchema = z.object({
  subject: z.string(),
  body: z.string().min(1, "Corps du message requis"),
  category: emailCategorySchema,
  clientName: z.string().optional(),
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

  const parsed = draftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const result = await draftEmailReply(
      parsed.data.subject,
      parsed.data.body,
      parsed.data.category,
      parsed.data.clientName,
      req.signal
    )
    return NextResponse.json(result)
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")
    console.error("Email draft error:", err)
    return NextResponse.json(
      {
        error: isTimeout
          ? "Délai de génération dépassé (30s)"
          : "Erreur lors de la génération du brouillon",
      },
      { status: isTimeout ? 504 : 502 }
    )
  }
}

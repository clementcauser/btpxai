import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { classifyEmail } from "@/lib/agents/email"
import { saveEmailCategory } from "@/lib/email-statuses"

export const maxDuration = 30

const classifySchema = z.object({
  subject: z.string(),
  body: z.string().min(1, "Corps du message requis"),
  messageId: z.string().optional(),
  threadId: z.string().optional(),
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

  const parsed = classifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const result = await classifyEmail(parsed.data.subject, parsed.data.body, req.signal)

    if (parsed.data.messageId && parsed.data.threadId) {
      saveEmailCategory(parsed.data.messageId, parsed.data.threadId, result.category).catch(
        (err) => console.error("Failed to persist email category:", err)
      )
    }

    return NextResponse.json(result)
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")
    console.error("Email classify error:", err)
    return NextResponse.json(
      {
        error: isTimeout
          ? "Délai de classification dépassé (30s)"
          : "Erreur lors de la classification",
      },
      { status: isTimeout ? 504 : 502 }
    )
  }
}

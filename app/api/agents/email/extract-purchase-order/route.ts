import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { getAttachmentData } from "@/lib/gmail"
import { extractPurchaseOrder, isSupportedMimeType } from "@/lib/agents/purchase-order"

export const maxDuration = 30

const extractSchema = z.object({
  messageId: z.string().min(1),
  attachmentId: z.string().min(1),
  mimeType: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = extractSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { messageId, attachmentId, mimeType } = parsed.data

  if (!isSupportedMimeType(mimeType)) {
    return NextResponse.json(
      { error: `Type de fichier non supporté : ${mimeType}` },
      { status: 422 }
    )
  }

  try {
    const attachmentBuffer = await getAttachmentData(messageId, attachmentId)
    const extraction = await extractPurchaseOrder(attachmentBuffer, mimeType, req.signal)
    return NextResponse.json(extraction)
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")
    console.error("Purchase order extraction error:", err)
    return NextResponse.json(
      {
        error: isTimeout
          ? "Délai d'extraction dépassé (30s)"
          : "Erreur lors de l'extraction du bon de commande",
      },
      { status: isTimeout ? 504 : 502 }
    )
  }
}

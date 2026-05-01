import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { updateAlerteStatus } from "@/lib/terrain-alertes"

const patchSchema = z.object({
  status: z.enum(["ouvert", "pris_en_charge", "resolu"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const alerte = await updateAlerteStatus(
      supabaseService,
      id,
      parsed.data.status,
      user.id
    )
    return NextResponse.json({ alerte })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }
}

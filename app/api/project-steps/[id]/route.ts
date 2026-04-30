import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { updateProjectStep, deleteProjectStep } from "@/lib/project-steps"

const idSchema = z.string().uuid()

const patchSchema = z
  .object({
    completed_at: z.string().nullable().optional(),
    completed_by: z.string().nullable().optional(),
    label: z.string().min(1).max(200).optional(),
    order: z.number().int().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Aucune donnée à mettre à jour" })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "ID invalide" }, { status: 422 })
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

  const role = getUserRole(user)
  if (
    (parsed.data.label !== undefined || parsed.data.order !== undefined) &&
    role !== "admin" &&
    role !== "bureau"
  ) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  try {
    const step = await updateProjectStep(supabaseService, id, parsed.data)
    return NextResponse.json({ step })
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'étape" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "ID invalide" }, { status: 422 })
  }

  try {
    await deleteProjectStep(supabaseService, id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'étape" },
      { status: 500 }
    )
  }
}

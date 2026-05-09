import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace } from "@/lib/workspaces"
import {
  getMateriauxRequests,
  createMateriauxRequest,
} from "@/lib/terrain-materiaux"

const getSchema = z.object({
  project_id: z.string().uuid("project_id doit être un UUID valide"),
})

const postSchema = z.object({
  project_id: z.string().uuid(),
  label: z.string().min(1).max(200),
  quantity: z.string().min(1).max(100),
  urgency: z.enum(["normal", "urgent", "critique"]),
  comment: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = getSchema.safeParse({ project_id: searchParams.get("project_id") })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètre invalide", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const requests = await getMateriauxRequests(supabaseService, parsed.data.project_id)
    return NextResponse.json({ requests })
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const raw = {
    project_id: formData.get("project_id"),
    label: formData.get("label"),
    quantity: formData.get("quantity"),
    urgency: formData.get("urgency"),
    comment: formData.get("comment") ?? undefined,
  }

  const parsed = postSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  let photoUrl: string | null = null
  const photoFile = formData.get("photo")
  if (photoFile instanceof File && photoFile.size > 0) {
    const fileName = `${parsed.data.project_id}/${crypto.randomUUID()}.jpg`
    const arrayBuffer = await photoFile.arrayBuffer()
    const { error: uploadError } = await supabaseService.storage
      .from("terrain-photos")
      .upload(fileName, Buffer.from(arrayBuffer), { contentType: photoFile.type })

    if (uploadError) {
      return NextResponse.json({ error: "Erreur upload photo" }, { status: 500 })
    }

    const { data: urlData } = supabaseService.storage
      .from("terrain-photos")
      .getPublicUrl(fileName)
    photoUrl = urlData.publicUrl
  }

  try {
    const { workspaceId } = await requireWorkspace(user.id)
    const request = await createMateriauxRequest(supabaseService, workspaceId, {
      project_id: parsed.data.project_id,
      user_id: user.id,
      label: parsed.data.label,
      quantity: parsed.data.quantity,
      urgency: parsed.data.urgency,
      comment: parsed.data.comment ?? null,
      photo_url: photoUrl,
    })
    return NextResponse.json({ request }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde de la demande" },
      { status: 500 }
    )
  }
}

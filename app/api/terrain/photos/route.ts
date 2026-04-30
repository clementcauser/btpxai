import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { getTerrainPhotos, createTerrainPhoto } from "@/lib/terrain-photos"

const getSchema = z.object({
  project_id: z.string().uuid("project_id doit être un UUID valide"),
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
    const photos = await getTerrainPhotos(supabaseService, parsed.data.project_id)
    return NextResponse.json({ photos })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la récupération des photos" }, { status: 500 })
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

  const projectId = formData.get("project_id")
  const photoFile = formData.get("photo")
  const latRaw = formData.get("lat")
  const lngRaw = formData.get("lng")

  if (typeof projectId !== "string" || !z.string().uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "project_id invalide" }, { status: 422 })
  }

  if (!(photoFile instanceof File)) {
    return NextResponse.json({ error: "photo requise" }, { status: 422 })
  }

  const lat = latRaw ? parseFloat(latRaw as string) : null
  const lng = lngRaw ? parseFloat(lngRaw as string) : null

  const ext = photoFile.type === "image/png" ? "png" : "jpg"
  const fileName = `${projectId}/${crypto.randomUUID()}.${ext}`
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

  try {
    const photo = await createTerrainPhoto(supabaseService, {
      project_id: projectId,
      user_id: user.id,
      photo_url: urlData.publicUrl,
      lat: lat && !isNaN(lat) ? lat : null,
      lng: lng && !isNaN(lng) ? lng : null,
    })
    return NextResponse.json({ photo }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la sauvegarde de la photo" }, { status: 500 })
  }
}

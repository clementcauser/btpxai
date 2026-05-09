import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace } from "@/lib/workspaces"
import { createAlerte, getAllAlertes } from "@/lib/terrain-alertes"

const postSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  urgency: z.enum(["faible", "elevee", "critique"]),
  description: z.string().min(1).max(1000),
})

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const alertes = await getAllAlertes(supabaseService)
    return NextResponse.json({ alertes })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la récupération des alertes" }, { status: 500 })
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

  const rawProjectId = formData.get("project_id")
  const raw = {
    project_id: rawProjectId && rawProjectId !== "" ? rawProjectId : null,
    urgency: formData.get("urgency"),
    description: formData.get("description"),
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
    const fileName = `alertes/${crypto.randomUUID()}.jpg`
    const arrayBuffer = await photoFile.arrayBuffer()
    const { error: uploadError } = await supabaseService.storage
      .from("terrain-photos")
      .upload(fileName, Buffer.from(arrayBuffer), { contentType: photoFile.type })

    if (!uploadError) {
      const { data: urlData } = supabaseService.storage
        .from("terrain-photos")
        .getPublicUrl(fileName)
      photoUrl = urlData.publicUrl
    }
  }

  try {
    const { workspaceId } = await requireWorkspace(user.id)
    const alerte = await createAlerte(supabaseService, workspaceId, {
      project_id: parsed.data.project_id ?? null,
      user_id: user.id,
      urgency: parsed.data.urgency,
      description: parsed.data.description,
      photo_url: photoUrl,
    })

    // Fire-and-forget email notification to bureau
    notifyBureau(alerte).catch(() => null)

    return NextResponse.json({ alerte }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création de l'alerte" }, { status: 500 })
  }
}

async function notifyBureau(alerte: { urgency: string; description: string; id: string }) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const urgencyLabel: Record<string, string> = {
    faible: "Faible",
    elevee: "Élevée 🟠",
    critique: "CRITIQUE 🔴",
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "alertes@btpxai.fr",
      to: [process.env.BUREAU_EMAIL ?? "bureau@btpxai.fr"],
      subject: `🚨 Alerte terrain — Urgence ${urgencyLabel[alerte.urgency] ?? alerte.urgency}`,
      html: `<p><strong>Nouvelle alerte terrain</strong></p>
<p><strong>Urgence :</strong> ${urgencyLabel[alerte.urgency] ?? alerte.urgency}</p>
<p><strong>Description :</strong> ${alerte.description}</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/alertes">Voir dans le tableau de bord →</a></p>`,
    }),
  })
}

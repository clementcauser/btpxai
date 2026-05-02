import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const briefSchema = z.object({
  client_id: z.string().uuid("Client invalide"),
  travaux_description: z
    .string()
    .min(10, "Description trop courte (10 caractères minimum)"),
  materials: z.string().optional(),
  delai: z.string().min(1, "Délai requis"),
  notes_internes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let workspaceId: string
  try {
    const ws = await requireWorkspace(user.id)
    workspaceId = ws.workspaceId
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = briefSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { client_id, travaux_description, materials, delai, notes_internes } =
    parsed.data

  let projectDescription = travaux_description
  if (materials?.trim()) {
    projectDescription += `\n\nMatériaux évoqués : ${materials.trim()}`
  }
  projectDescription += `\n\nDélai souhaité : ${delai}`

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const { data: project, error: projectError } = await supabaseService
    .from("projects")
    .insert({
      client_id,
      title: `Brief devis — ${today}`,
      description: projectDescription,
      workspace_id: workspaceId,
    })
    .select()
    .single()

  if (projectError) {
    console.error("Error creating project:", projectError)
    return NextResponse.json(
      { error: "Erreur lors de la création du projet" },
      { status: 500 }
    )
  }

  const { data: quote, error: quoteError } = await supabaseService
    .from("quotes")
    .insert({
      project_id: project.id,
      notes: notes_internes?.trim() || null,
      workspace_id: workspaceId,
    })
    .select()
    .single()

  if (quoteError) {
    console.error("Error creating quote:", quoteError)
    return NextResponse.json(
      { error: "Erreur lors de la création du devis" },
      { status: 500 }
    )
  }

  return NextResponse.json({ quote_id: quote.id }, { status: 201 })
}

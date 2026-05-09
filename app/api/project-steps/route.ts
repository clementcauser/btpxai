import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { getProjectSteps, createProjectStep } from "@/lib/project-steps"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const getSchema = z.object({
  project_id: z.string().uuid("project_id doit être un UUID valide"),
})

const postSchema = z.object({
  project_id: z.string().uuid(),
  label: z.string().min(1).max(200),
  order: z.number().int().min(1),
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
    const steps = await getProjectSteps(supabaseService, parsed.data.project_id)
    return NextResponse.json({ steps })
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des étapes" },
      { status: 500 }
    )
  }
}

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

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
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

  try {
    const step = await createProjectStep(supabaseService, {
      project_id: parsed.data.project_id,
      label: parsed.data.label,
      order: parsed.data.order,
      workspace_id: workspaceId,
    })
    return NextResponse.json({ step }, { status: 201 })
  } catch (err) {
    console.error("createProjectStep error:", err)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'étape" },
      { status: 500 }
    )
  }
}

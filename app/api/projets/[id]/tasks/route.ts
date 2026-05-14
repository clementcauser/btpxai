import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const PostTasksSchema = z.object({
  titles: z
    .array(z.string().min(1).max(500))
    .min(1, "Au moins une tâche requise")
    .max(50, "Maximum 50 tâches par envoi"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const role = getUserRole(user)
  if (role === "ouvrier") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  let workspaceId: string
  try {
    ;({ workspaceId } = await requireWorkspace(user.id))
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  const { id: projectId } = await params

  // Validate projectId as UUID (fix 2)
  if (!z.string().uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "Identifiant de projet invalide" }, { status: 400 })
  }

  // Verify project belongs to workspace (fix 1)
  const { data: project, error: projectError } = await supabaseService
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const result = PostTasksSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Données invalides", details: result.error.flatten() },
      { status: 422 }
    )
  }

  const rows = result.data.titles.map((title) => ({
    project_id: projectId,
    workspace_id: workspaceId,
    title,
    status: "todo" as const,
  }))

  const { data, error } = await supabaseService
    .from("tasks")
    .insert(rows)
    .select()

  if (error) {
    console.error("Error inserting tasks", { projectId, workspaceId, error })
    return NextResponse.json(
      { error: "Erreur lors de la création des tâches" },
      { status: 500 }
    )
  }

  return NextResponse.json({ tasks: data }, { status: 201 })
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const PostTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(500),
        assignedTo: z.string().uuid().optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/).optional(),
      })
    )
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
  if (!["admin", "bureau", "super_admin"].includes(role ?? "")) {
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

  if (!z.string().uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "Identifiant de projet invalide" }, { status: 400 })
  }

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

  const rows = result.data.tasks.map(({ title, assignedTo, dueDate }) => ({
    project_id: projectId,
    workspace_id: workspaceId,
    title,
    status: "todo" as const,
    ...(assignedTo ? { assigned_to: assignedTo } : {}),
    ...(dueDate ? { due_date: dueDate } : {}),
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

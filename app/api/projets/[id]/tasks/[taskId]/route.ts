import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const PatchTaskSchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  title: z.string().min(1).max(500).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Au moins un champ requis" })

async function authorize(userId: string) {
  let workspaceId: string
  try {
    ;({ workspaceId } = await requireWorkspace(userId))
  } catch (err) {
    if (err instanceof WorkspaceError) return { error: err.message }
    throw err
  }
  return { workspaceId }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (!["admin", "bureau", "super_admin"].includes(role ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const auth = await authorize(user.id)
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 })

  const { id: projectId, taskId } = await params

  if (!z.string().uuid().safeParse(projectId).success || !z.string().uuid().safeParse(taskId).success)
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const result = PatchTaskSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: "Données invalides", details: result.error.flatten() }, { status: 422 })

  const { error } = await supabaseService
    .from("tasks")
    .update(result.data)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("workspace_id", auth.workspaceId)

  if (error) return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (!["admin", "bureau", "super_admin"].includes(role ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const auth = await authorize(user.id)
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 })

  const { id: projectId, taskId } = await params

  if (!z.string().uuid().safeParse(projectId).success || !z.string().uuid().safeParse(taskId).success)
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 })

  const { error } = await supabaseService
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("workspace_id", auth.workspaceId)

  if (error) return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })

  return NextResponse.json({ ok: true })
}

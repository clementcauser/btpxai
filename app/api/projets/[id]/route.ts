import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const UpdateProjectSchema = z.object({
  title: z.string().min(1, "Le titre est requis").optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(["planned", "in_progress", "completed", "cancelled"])
    .optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let workspaceId: string
  try {
    ;({ workspaceId } = await requireWorkspace(user.id))
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const result = UpdateProjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Données invalides", details: result.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabaseService
    .from("projects")
    .update(result.data)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select()
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
    }
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du projet" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

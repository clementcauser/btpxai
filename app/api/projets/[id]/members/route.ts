import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const memberSchema = z.object({
  userId: z.string().min(1, "userId requis"),
})

async function getAuth(userId: string) {
  let workspaceId: string
  try {
    const ws = await requireWorkspace(userId)
    workspaceId = ws.workspaceId
    return { workspaceId }
  } catch (err) {
    if (err instanceof WorkspaceError) throw err
    throw err
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let workspaceId: string
  try {
    ;({ workspaceId } = await getAuth(user.id))
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  const { id: projectId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = memberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { userId } = parsed.data

  const { error } = await supabaseService.from("project_members").insert({
    project_id: projectId,
    user_id: userId,
    workspace_id: workspaceId,
  })

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce membre est déjà assigné au projet" },
        { status: 409 }
      )
    }
    console.error("Error adding project member:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du membre" },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    await getAuth(user.id)
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  const { id: projectId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = memberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { userId } = parsed.data

  const { error } = await supabaseService
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error removing project member:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du membre" },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

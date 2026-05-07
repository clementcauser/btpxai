import { NextRequest, NextResponse } from "next/server"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { supabaseService } from "@/lib/supabase/service"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  if (getUserRole(user) !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 })
  }

  let workspaceId: string
  try {
    const ws = await requireWorkspace(user.id)
    workspaceId = ws.workspaceId
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: "Workspace introuvable" }, { status: 400 })
    throw err
  }

  const { id } = await params

  const { data: conn } = await supabaseService
    .from("gmail_connections")
    .select("access_token")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single()

  if (!conn) {
    return NextResponse.json({ error: "Connexion introuvable" }, { status: 404 })
  }

  await fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, {
    method: "POST",
  }).catch(() => null)

  await supabaseService
    .from("gmail_connections")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { ImapClient } from "@/lib/imap"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
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

  const connectionId = req.nextUrl.searchParams.get("connectionId")
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId requis" }, { status: 400 })
  }

  const { id } = await params

  try {
    const client = await ImapClient.forConnection(connectionId, workspaceId)
    const email = await client.getEmail(id)
    await client.markAsRead(id).catch(() => null)
    return NextResponse.json({ email })
  } catch (err) {
    console.error("Erreur getEmail IMAP:", err)
    return NextResponse.json({ error: "Impossible de charger l'email" }, { status: 500 })
  }
}

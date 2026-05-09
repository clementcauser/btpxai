import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { GmailClient } from "@/lib/gmail"
import { ImapClient } from "@/lib/imap"
import { upsertEmailStatus } from "@/lib/email-statuses"

const archiveSchema = z.object({
  threadId: z.string().min(1),
  connectionId: z.string().uuid(),
  provider: z.enum(["gmail", "imap"]).default("gmail"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
  }

  const parsed = archiveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 422 })
  }

  try {
    const { workspaceId } = await requireWorkspace(user.id)
    const { connectionId, threadId, provider } = parsed.data
    const archiveOp =
      provider === "imap"
        ? ImapClient.forConnection(connectionId, workspaceId).then((c) => c.archiveEmail(id))
        : GmailClient.forConnection(connectionId, workspaceId).then((c) => c.archiveEmail(id))
    await Promise.all([
      archiveOp,
      upsertEmailStatus(workspaceId, id, threadId, "archive"),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erreur archiveEmail:", err)
    return NextResponse.json({ error: "Erreur lors de l'archivage" }, { status: 500 })
  }
}

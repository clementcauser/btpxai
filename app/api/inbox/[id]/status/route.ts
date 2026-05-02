import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { upsertEmailStatus } from "@/lib/email-statuses"

const statusSchema = z.object({
  threadId: z.string().min(1),
  status: z.enum(["a_traiter", "en_cours", "repondu", "archive"]),
  clientId: z.string().uuid().nullable().optional(),
})

export async function PATCH(
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

  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 422 })
  }

  try {
    const { workspaceId } = await requireWorkspace(user.id)
    const record = await upsertEmailStatus(
      workspaceId,
      id,
      parsed.data.threadId,
      parsed.data.status,
      parsed.data.clientId
    )
    return NextResponse.json({ record })
  } catch (err) {
    console.error("Erreur upsertEmailStatus:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { updateEventType, deleteEventType } from "@/lib/calendar-event-types"

const UpdateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    const { role } = await requireWorkspace(user.id)
    if (role !== "admin" && role !== "bureau") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const supabase = await createClient()
    const updated = await updateEventType(supabase, id, parsed.data)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    const { role } = await requireWorkspace(user.id)
    if (role !== "admin" && role !== "bureau") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
    const { id } = await params
    const supabase = await createClient()
    await deleteEventType(supabase, id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : "Erreur serveur"
    const status = message.includes("utilisé") ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

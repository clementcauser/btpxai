import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { updateEvent, deleteEvent } from "@/lib/calendar"

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  event_type_id: z.string().uuid().nullable().optional(),
  assignee_ids: z.array(z.string().uuid()).optional(),
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
    const updated = await updateEvent(supabase, id, parsed.data)
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
    await deleteEvent(supabase, id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

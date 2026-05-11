import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { getEvents, createEvent } from "@/lib/calendar"

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  event_type_id: z.string().uuid().nullable().optional(),
  assignee_ids: z.array(z.string().uuid()).optional(),
})

export async function GET(req: Request) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    const { workspaceId } = await requireWorkspace(user.id)
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const assigneeId = searchParams.get("assigneeId") ?? undefined
    if (!from || !to) {
      return NextResponse.json({ error: "Paramètres from/to requis" }, { status: 400 })
    }
    const supabase = await createClient()
    const events = await getEvents(supabase, workspaceId, { from, to, assigneeId })
    return NextResponse.json(events)
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    const { workspaceId, role } = await requireWorkspace(user.id)
    if (role !== "admin" && role !== "bureau") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const supabase = await createClient()
    const event = await createEvent(supabase, workspaceId, parsed.data)
    return NextResponse.json(event, { status: 201 })
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { getEventTypes, createEventType } from "@/lib/calendar-event-types"

const CreateSchema = z.object({
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    const { workspaceId } = await requireWorkspace(user.id)
    const supabase = await createClient()
    const types = await getEventTypes(supabase, workspaceId)
    return NextResponse.json(types)
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
    const created = await createEventType(supabase, workspaceId, parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { seedDefaultEventTypes } from "@/lib/calendar-event-types"

const createSchema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug invalide (minuscules, chiffres, tirets)"),
})

async function requireSuperAdmin() {
  const user = await getUser()
  if (!user) return null
  if (getUserRole(user) !== "super_admin") return null
  return user
}

export async function GET(): Promise<NextResponse> {
  if (!(await requireSuperAdmin()))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { data: workspaces, error } = await supabaseService
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workspaces })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await requireSuperAdmin()))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data: workspace, error } = await supabaseService
    .from("workspaces")
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select()
    .single()

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Seed default calendar event types for the new workspace
  await seedDefaultEventTypes(supabaseService as any, workspace.id).catch(() => {})

  return NextResponse.json({ workspace }, { status: 201 })
}

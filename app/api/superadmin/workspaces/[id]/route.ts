import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
})

async function requireSuperAdmin() {
  const user = await getUser()
  if (!user) return null
  if (getUserRole(user) !== "super_admin") return null
  return user
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await requireSuperAdmin()))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data: workspace, error } = await supabaseService
    .from("workspaces")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!workspace) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  return NextResponse.json({ workspace })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await requireSuperAdmin()))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseService.from("workspaces").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

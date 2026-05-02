import { NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const updateSchema = z.object({
  email: z.string().email("Email invalide").optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["admin", "bureau", "ouvrier"]).optional(),
})

async function requireAdmin() {
  const user = await getUser()
  if (!user) return null
  const role = getUserRole(user)
  if (role !== "admin") return null
  return user
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, name, role } = parsed.data

  const updatePayload: {
    email?: string
    user_metadata?: Record<string, string>
  } = {}
  if (email) updatePayload.email = email
  if (name !== undefined || role !== undefined) {
    updatePayload.user_metadata = {}
    if (name !== undefined) updatePayload.user_metadata.name = name
    if (role !== undefined) updatePayload.user_metadata.role = role
  }

  const { data, error } = await supabaseService.auth.admin.updateUserById(id, updatePayload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name: (data.user.user_metadata?.name as string | undefined) ?? null,
      role: (data.user.user_metadata?.role as string | undefined) ?? null,
      created_at: data.user.created_at,
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 })
  }

  const { error } = await supabaseService.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

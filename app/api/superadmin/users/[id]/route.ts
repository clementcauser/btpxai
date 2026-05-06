import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "bureau", "ouvrier", "super_admin"]).optional(),
  password: z.string().min(8).optional(),
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

  const { email, name, role, password } = parsed.data

  const updatePayload: Parameters<typeof supabaseService.auth.admin.updateUserById>[1] = {}
  if (email) updatePayload.email = email
  if (password) updatePayload.password = password
  if (name !== undefined || role !== undefined) {
    updatePayload.user_metadata = {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
    }
  }

  const { data, error } = await supabaseService.auth.admin.updateUserById(id, updatePayload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const user = {
    id: data.user.id,
    email: data.user.email ?? "",
    name: (data.user.user_metadata?.name as string | undefined) ?? null,
    role: (data.user.user_metadata?.role as string | undefined) ?? null,
    created_at: data.user.created_at,
  }

  return NextResponse.json({ user })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await requireSuperAdmin()))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseService.auth.admin.deleteUser(id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

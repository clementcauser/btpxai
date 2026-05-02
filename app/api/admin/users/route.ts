import { NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const createSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis").max(100),
  role: z.enum(["admin", "bureau", "ouvrier"]),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").optional(),
})

async function requireAdmin() {
  const user = await getUser()
  if (!user) return null
  const role = getUserRole(user)
  if (role !== "admin") return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabaseService.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = (data.users ?? []).map((u: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at: string }) => ({
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string | undefined) ?? null,
    role: (u.user_metadata?.role as string | undefined) ?? null,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, name, role, password } = parsed.data

  const { data, error } = await supabaseService.auth.admin.createUser({
    email,
    password: password ?? crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name, role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name,
        role,
        created_at: data.user.created_at,
      },
    },
    { status: 201 }
  )
}

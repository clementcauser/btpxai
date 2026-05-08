import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { User } from "@supabase/supabase-js"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const createSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
  name: z.string().min(2, "Nom requis").optional(),
  role: z.enum(["admin", "bureau", "ouvrier", "super_admin"]),
  workspace_id: z.string().uuid("workspace_id invalide").optional(),
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

  const { data, error } = await supabaseService.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map((u: User) => ({
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string | undefined) ?? null,
    role: (u.user_metadata?.role as string | undefined) ?? null,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
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

  const { email, password, name, role, workspace_id } = parsed.data

  const { data, error } = await supabaseService.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name ?? "", role },
  })

  if (error) {
    if (error.message.includes("already registered")) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (workspace_id && role !== "super_admin") {
    const { error: memberError } = await supabaseService
      .from("workspace_members")
      .insert({ workspace_id, user_id: data.user.id, role })

    if (memberError) {
      console.error("[superadmin/users] workspace_members insert failed:", memberError)
    }
  }

  const user = {
    id: data.user.id,
    email: data.user.email ?? "",
    name: (data.user.user_metadata?.name as string | undefined) ?? null,
    role: (data.user.user_metadata?.role as string | undefined) ?? null,
    created_at: data.user.created_at,
  }

  return NextResponse.json({ user }, { status: 201 })
}

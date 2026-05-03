import { NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const createSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  slug: z
    .string()
    .min(1, "Slug requis")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug : lettres minuscules, chiffres et tirets uniquement"),
  owner_id: z.string().uuid("UUID invalide").nullable().optional(),
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

  const { data, error } = await supabaseService
    .from("workspaces")
    .select("id, name, slug, owner_id, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ workspaces: data })
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, slug, owner_id } = parsed.data

  const { data, error } = await supabaseService
    .from("workspaces")
    .insert({ name, slug, owner_id: owner_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ workspace: data }, { status: 201 })
}

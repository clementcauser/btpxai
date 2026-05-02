import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const createClientSchema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  email: z.string().email("Email invalide").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let workspaceId: string
  try {
    const ws = await requireWorkspace(user.id)
    workspaceId = ws.workspaceId
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { name, email, phone, address } = parsed.data

  const { data: client, error } = await supabaseService
    .from("clients")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      workspace_id: workspaceId,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du client" },
      { status: 500 }
    )
  }

  return NextResponse.json({ client }, { status: 201 })
}

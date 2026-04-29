import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const updateClientSchema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)").optional(),
  email: z.string().email("Email invalide").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const { data: client, error } = await supabaseService
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
  }

  return NextResponse.json({ client })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = updateClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data: client, error } = await supabaseService
    .from("clients")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error || !client) {
    console.error("Error updating client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du client" },
      { status: 500 }
    )
  }

  return NextResponse.json({ client })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const { error } = await supabaseService.from("clients").delete().eq("id", id)

  if (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du client" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

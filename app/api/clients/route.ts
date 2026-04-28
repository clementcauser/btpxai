import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

const createClientSchema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  email: z.string().email("Email invalide").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
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
  const supabase = await createSupabaseClient()

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
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

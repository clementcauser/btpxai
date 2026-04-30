import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"

const updateSchema = z.object({
  enabled: z.boolean(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("quotes")
    .select("reminders_enabled")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
  }

  return NextResponse.json({ reminders_enabled: data.reminders_enabled })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètre 'enabled' (boolean) requis" }, { status: 422 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("quotes")
    .update({ reminders_enabled: parsed.data.enabled })
    .eq("id", id)
    .select("reminders_enabled")
    .single()

  if (error) {
    return NextResponse.json({ error: "Impossible de mettre à jour" }, { status: 500 })
  }

  return NextResponse.json({ reminders_enabled: data.reminders_enabled })
}

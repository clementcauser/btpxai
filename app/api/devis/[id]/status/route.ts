import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"
import { updateQuote } from "@/lib/quotes"

const schema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
  }

  try {
    const quote = await updateQuote(supabase, id, { status: parsed.data.status })
    return NextResponse.json(quote)
  } catch {
    return NextResponse.json(
      { error: "Impossible de mettre à jour le statut" },
      { status: 500 }
    )
  }
}

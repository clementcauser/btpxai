import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { updateQuote } from "@/lib/quotes"
import { auth } from "@/lib/auth"

const schema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
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

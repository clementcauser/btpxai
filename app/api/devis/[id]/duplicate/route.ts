import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { duplicateQuote } from "@/lib/quotes"
import { auth } from "@/lib/auth"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const quote = await duplicateQuote(supabase, id)
    return NextResponse.json(quote)
  } catch {
    return NextResponse.json(
      { error: "Impossible de dupliquer le devis" },
      { status: 500 }
    )
  }
}

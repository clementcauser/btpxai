import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { duplicateQuote } from "@/lib/quotes"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

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

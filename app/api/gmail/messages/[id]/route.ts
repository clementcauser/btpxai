import { NextRequest, NextResponse } from "next/server"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { getEmail, markAsRead } from "@/lib/gmail"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  try {
    const email = await getEmail(id)
    await markAsRead(id).catch(() => null)
    return NextResponse.json({ email })
  } catch (err) {
    console.error("Erreur getEmail:", err)
    return NextResponse.json({ error: "Impossible de charger l'email" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { syncAllToSheets } from "@/lib/sheets"

function requireBureauOrAdmin(role?: string | null) {
  return role === "admin" || role === "bureau"
}

export async function POST(): Promise<NextResponse> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!requireBureauOrAdmin(getUserRole(user))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  try {
    const { workspaceId } = await requireWorkspace(user.id)
    const { results, syncedAt, hasError } = await syncAllToSheets(workspaceId)
    return NextResponse.json({ results, syncedAt, hasError }, { status: hasError ? 207 : 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { syncAllToSheets } from "@/lib/sheets"
import { supabaseService } from "@/lib/supabase/service"

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: workspaces, error } = await supabaseService.from("workspaces").select("id")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const perWorkspace: Array<{
    workspaceId: string
    syncedAt?: string
    hasError: boolean
    results?: unknown
    error?: string
  }> = []

  for (const ws of workspaces ?? []) {
    try {
      const { results, syncedAt, hasError } = await syncAllToSheets(ws.id)
      perWorkspace.push({ workspaceId: ws.id, results, syncedAt, hasError })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      perWorkspace.push({ workspaceId: ws.id, hasError: true, error: message })
    }
  }

  const hasError = perWorkspace.some((w) => w.hasError)
  return NextResponse.json(
    { workspaces: perWorkspace.length, perWorkspace },
    { status: hasError ? 207 : 200 }
  )
}

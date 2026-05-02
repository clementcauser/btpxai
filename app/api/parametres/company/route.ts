import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { getMultipleSettings, setAppSetting } from "@/lib/settings"

const COMPANY_KEYS = ["company_name", "company_address", "company_siret", "company_logo_url"]

const bodySchema = z.object({
  company_name: z.string().max(200),
  company_address: z.string().max(500),
  company_siret: z.string().max(20),
})

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { workspaceId } = await requireWorkspace(user.id)
  const settings = await getMultipleSettings(workspaceId, COMPANY_KEYS)
  return NextResponse.json(settings)
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { workspaceId } = await requireWorkspace(user.id)
  const { company_name, company_address, company_siret } = parsed.data
  await Promise.all([
    setAppSetting(workspaceId, "company_name", company_name),
    setAppSetting(workspaceId, "company_address", company_address),
    setAppSetting(workspaceId, "company_siret", company_siret),
  ])

  return NextResponse.json({ ok: true })
}

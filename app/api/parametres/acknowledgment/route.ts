import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  getAutoAcknowledgmentEnabled,
  setAutoAcknowledgmentEnabled,
} from "@/lib/acknowledgments"

const bodySchema = z.object({ enabled: z.boolean() })

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const enabled = await getAutoAcknowledgmentEnabled()
  return NextResponse.json({ enabled })
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = user.user_metadata?.role as string | undefined
  if (!role || !["bureau", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  await setAutoAcknowledgmentEnabled(parsed.data.enabled)
  return NextResponse.json({ enabled: parsed.data.enabled })
}

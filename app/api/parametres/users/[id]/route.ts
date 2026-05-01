import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const bodySchema = z.object({
  role: z.enum(["admin", "bureau", "ouvrier"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currentRole = getUserRole(user)
  if (currentRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { role } = parsed.data

  const { error } = await supabaseService.auth.admin.updateUserById(id, {
    user_metadata: { role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

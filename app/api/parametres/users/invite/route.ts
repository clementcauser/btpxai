import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "bureau", "ouvrier"]),
})

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currentRole = getUserRole(user)
  if (currentRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { email, role } = parsed.data

  const { data, error } = await supabaseService.auth.admin.inviteUserByEmail(email, {
    data: { role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role,
      created_at: data.user.created_at,
    },
  })
}

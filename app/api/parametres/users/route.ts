import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabaseService.auth.admin.listUsers({ perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map((u: User) => ({
    id: u.id,
    email: u.email ?? "",
    role: (u.user_metadata?.role as string | undefined) ?? null,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
}

import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace } from "@/lib/workspaces"

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { workspaceId } = await requireWorkspace(user.id)

  const { data: members, error: membersError } = await supabaseService
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  const memberIds = new Set(members.map((m) => m.user_id))

  const { data, error } = await supabaseService.auth.admin.listUsers({ perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users
    .filter((u: User) => memberIds.has(u.id) && u.user_metadata?.role !== "super_admin")
    .map((u: User) => ({
      id: u.id,
      email: u.email ?? "",
      role: (u.user_metadata?.role as string | undefined) ?? null,
      created_at: u.created_at,
    }))

  return NextResponse.json({ users })
}

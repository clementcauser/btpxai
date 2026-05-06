import type { Metadata } from "next"
import type { User } from "@supabase/supabase-js"
import { Users } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { UsersTable } from "@/components/superadmin/users-table"
import type { UserRow } from "@/components/superadmin/user-form-modal"

export const metadata: Metadata = {
  title: "Utilisateurs — BTP×AI Superadmin",
}

export default async function SuperAdminUsersPage() {
  const { data, error } = await supabaseService.auth.admin.listUsers({ perPage: 1000 })

  const users: UserRow[] = error
    ? []
    : data.users.map((u: User) => ({
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata?.name as string | undefined) ?? null,
        role: (u.user_metadata?.role as string | undefined) ?? null,
        created_at: u.created_at,
      }))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">Superadmin</span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-wide uppercase text-foreground">
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""} · tous les comptes Supabase Auth
        </p>
      </div>
      <UsersTable users={users} />
    </div>
  )
}

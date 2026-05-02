import type { Metadata } from "next"
import { Users } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { UsersList } from "@/components/admin/users-list"

export const metadata: Metadata = {
  title: "Utilisateurs — Admin BTP×AI",
}

export default async function UtilisateursPage() {
  const { data: usersData, error } = await supabaseService.auth.admin.listUsers({ perPage: 1000 })

  const users = (usersData?.users ?? []).map((u: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at: string }) => ({
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string | undefined) ?? null,
    role: (u.user_metadata?.role as "admin" | "bureau" | "ouvrier" | undefined) ?? null,
    created_at: u.created_at,
  }))

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="size-3.5 text-[#4F8EF7]/70" />
          <span className="text-xs text-[#4F8EF7]/70 tracking-widest uppercase font-mono">
            Gestion plateforme
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-wide uppercase text-white">
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-white/40">
          {error ? "Erreur de chargement" : `${users.length} utilisateur${users.length !== 1 ? "s" : ""} enregistré${users.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <UsersList initialUsers={users} />
    </div>
  )
}

import type { Metadata } from "next"
import { Building2 } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { WorkspacesList } from "@/components/admin/workspaces-list"

export const metadata: Metadata = {
  title: "Entreprises — Admin BTP×AI",
}

export default async function EntreprisesPage() {
  const { data: workspaces, error } = await supabaseService
    .from("workspaces")
    .select("id, name, slug, created_at, updated_at")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="size-3.5 text-[#4F8EF7]/70" />
          <span className="text-xs text-[#4F8EF7]/70 tracking-widest uppercase font-mono">
            Gestion plateforme
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-wide uppercase text-white">
          Entreprises
        </h1>
        <p className="mt-1 text-sm text-white/40">
          {error ? "Erreur de chargement" : `${workspaces?.length ?? 0} workspace${(workspaces?.length ?? 0) !== 1 ? "s" : ""} enregistré${(workspaces?.length ?? 0) !== 1 ? "s" : ""}`}
        </p>
      </div>

      <WorkspacesList initialWorkspaces={workspaces ?? []} />
    </div>
  )
}

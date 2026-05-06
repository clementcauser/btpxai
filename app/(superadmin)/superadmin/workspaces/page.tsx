import type { Metadata } from "next"
import { Building2 } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { WorkspacesTable } from "@/components/superadmin/workspaces-table"
import type { WorkspaceRow } from "@/components/superadmin/workspace-form-modal"

export const metadata: Metadata = {
  title: "Espaces de travail — BTP×AI Superadmin",
}

export default async function SuperAdminWorkspacesPage() {
  const { data, error } = await supabaseService
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false })

  const workspaces: WorkspaceRow[] = error ? [] : (data ?? [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">Superadmin</span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-wide uppercase text-foreground">
          Espaces de travail
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspaces.length} espace{workspaces.length !== 1 ? "s" : ""} · tous les espaces du système
        </p>
      </div>
      <WorkspacesTable workspaces={workspaces} />
    </div>
  )
}

import type { Metadata } from "next"
import { FolderOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getProjectsForTable } from "@/lib/projects"
import { ProjectsTable } from "@/components/projets/projects-table"

export const metadata: Metadata = {
  title: "Projets — BTP×AI",
}

export default async function ProjetsPage() {
  const supabase = await createClient()
  const projects = await getProjectsForTable(supabase).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Gestion
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Projets
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {projects.length} projet{projects.length !== 1 ? "s" : ""} au total · suivi des chantiers et devis associés
        </p>
      </div>

      <ProjectsTable projects={projects} />
    </div>
  )
}

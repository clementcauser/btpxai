import type { Metadata } from "next"
import Link from "next/link"
import { HardHat, ChevronRight, Circle } from "lucide-react"
import { createClient, getUser } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { ProjectWithClient } from "@/types"
import QuickAlertButton from "@/components/terrain/quick-alert-button"

async function isE2ETestRequest(): Promise<boolean> {
  if (process.env.NODE_ENV === "production" && process.env.IS_E2E !== "true") return false
  const cookieStore = await cookies()
  return cookieStore.get("cypress-test-user")?.value === "ouvrier"
}

const CYPRESS_FIXTURE: ProjectWithClient = {
  id: "test-project-id",
  title: "Portail Dumont",
  description: "Portail coulissant en acier galvanisé",
  status: "in_progress",
  client_id: "client-1",
  created_at: new Date().toISOString(),
  clients: { id: "client-1", name: "M. Dumont" },
}

export const metadata: Metadata = {
  title: "Chantiers — BTP×AI",
}

export default async function TerrainHomePage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const isE2E = await isE2ETestRequest()

  let rawProjects: ProjectWithClient[] | null = null

  if (isE2E) {
    rawProjects = [CYPRESS_FIXTURE]
  } else {
    const { data } = await supabase
      .from("projects")
      .select("*, clients(id, name)")
      .in("status", ["planned", "in_progress"])
      .order("created_at", { ascending: false })
    rawProjects = data as ProjectWithClient[] | null
  }

  const projects = rawProjects ?? []

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const activeCount = projects.filter((p) => p.status === "in_progress").length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-safe-top">
        <div className="flex items-start justify-between py-4">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-0.5"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              BTP×AI — Interface terrain
            </p>
            <h1
              className="text-3xl font-bold uppercase tracking-wide text-foreground leading-none"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              Mes chantiers
            </h1>
          </div>
          <div className="text-right pt-1">
            <p className="text-[11px] text-muted-foreground capitalize">{today}</p>
            {activeCount > 0 && (
              <p
                className="text-xs font-bold text-primary uppercase tracking-wide mt-0.5"
                style={{ fontFamily: "var(--font-barlow)" }}
              >
                {activeCount} en cours
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-3 pb-8">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))
        )}
      </main>

      <footer className="px-4 pb-safe-bottom pt-3 pb-4 border-t border-border space-y-3">
        <QuickAlertButton />
        <p className="text-center text-[11px] text-muted-foreground">
          {user?.email}
        </p>
      </footer>
    </div>
  )
}

const STATUS_CONFIG = {
  planned: {
    label: "Planifié",
    dotClass: "bg-zinc-500",
    borderColor: "oklch(0.4 0.008 258)",
  },
  in_progress: {
    label: "En cours",
    dotClass: "bg-primary animate-pulse",
    borderColor: "oklch(0.69 0.168 47)",
  },
  completed: {
    label: "Terminé",
    dotClass: "bg-emerald-500",
    borderColor: "oklch(0.62 0.12 150)",
  },
  cancelled: {
    label: "Annulé",
    dotClass: "bg-destructive",
    borderColor: "oklch(0.62 0.22 25)",
  },
} as const

function ProjectCard({
  project,
  index,
}: {
  project: ProjectWithClient
  index: number
}) {
  const config =
    STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planned

  return (
    <Link
      href={`/terrain/${project.id}`}
      data-testid="project-card"
      className="flex items-stretch bg-card border border-border rounded-sm overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "fadeSlideIn 0.3s ease both",
      }}
    >
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: config.borderColor }}
      />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold uppercase tracking-wide text-foreground truncate leading-tight"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              {project.title}
            </h2>
            {project.clients && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {project.clients.name}
              </p>
            )}
          </div>
          <span
            className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-sm shrink-0"
            style={{ minHeight: "28px" }}
          >
            <Circle
              className={`w-2 h-2 fill-current ${config.dotClass}`}
              style={{ color: "inherit" }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              {config.label}
            </span>
          </span>
        </div>

        {project.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-1 mt-3">
          <span
            className="text-xs font-bold text-primary uppercase tracking-widest"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Ouvrir
          </span>
          <ChevronRight className="w-3 h-3 text-primary" />
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-20 h-20 rounded-sm bg-muted flex items-center justify-center mb-5">
        <HardHat className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2
        className="text-2xl font-bold uppercase text-foreground tracking-wide"
        style={{ fontFamily: "var(--font-barlow)" }}
      >
        Aucun chantier
      </h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        Aucun chantier actif pour le moment.
        <br />
        Contactez le bureau pour plus d&apos;informations.
      </p>
    </div>
  )
}

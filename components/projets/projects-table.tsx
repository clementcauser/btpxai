"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { computeProjectTotal } from "@/lib/projects"
import type { ProjectForTable, ProjectStatus } from "@/types"

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string; dot: string; stripColor: string }
> = {
  planned: {
    label: "Planifié",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
    stripColor: "oklch(0.55 0.02 258)",
  },
  in_progress: {
    label: "En cours",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    stripColor: "oklch(0.69 0.168 47)",
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
    stripColor: "oklch(0.6 0.15 150)",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
    dot: "bg-red-400",
    stripColor: "oklch(0.55 0.2 25)",
  },
}

const ALL_STATUSES: ProjectStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]

const PER_PAGE = 15

function formatAmount(ht: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(ht)
}

type Props = { projects: ProjectForTable[] }

export function ProjectsTable({ projects }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const uniqueClients = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of projects) {
      if (p.client) seen.set(p.client.id, p.client.name)
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [projects])

  const stats = useMemo(
    () =>
      ALL_STATUSES.reduce(
        (acc, s) => ({
          ...acc,
          [s]: projects.filter((p) => p.status === s).length,
        }),
        {} as Record<ProjectStatus, number>
      ),
    [projects]
  )

  const filtered = useMemo(() => {
    let result = projects
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.client?.name.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter)
    }
    if (clientFilter !== "all") {
      result = result.filter((p) => p.client?.id === clientFilter)
    }
    return result
  }, [projects, search, statusFilter, clientFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const resetFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setClientFilter("all")
    setPage(1)
  }

  const hasFilters =
    search.trim() !== "" || statusFilter !== "all" || clientFilter !== "all"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un projet ou un client…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-9 text-sm bg-card border-border"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Client select */}
        <div className="relative">
          <select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setPage(1) }}
            className="h-9 rounded-sm border border-border bg-card text-sm text-foreground px-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[160px]"
          >
            <option value="all">Tous les clients</option>
            {uniqueClients.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
              <path d="M0 0l5 6 5-6z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setStatusFilter("all"); setPage(1) }}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
            statusFilter === "all"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
          )}
        >
          Tous
          <span className="tabular-nums opacity-70">{projects.length}</span>
        </button>
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                statusFilter === s
                  ? cfg.className
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
              <span className="tabular-nums opacity-70">{stats[s]}</span>
            </button>
          )
        })}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
          >
            <X className="size-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-sm border border-border overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <FolderOpen className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {hasFilters ? "Aucun projet ne correspond aux filtres" : "Aucun projet"}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase">
                  Projet
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden sm:table-cell">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase">
                  Statut
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden md:table-cell">
                  Montant HT
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginated.map((project) => {
                const cfg = STATUS_CONFIG[project.status as ProjectStatus]
                const total = computeProjectTotal(project.quotes)
                return (
                  <tr
                    key={project.id}
                    onClick={() => router.push(`/projets/${project.id}`)}
                    className="group cursor-pointer hover:bg-muted/20 transition-colors"
                  >
                    {/* Colored status strip */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-0.5 h-8 rounded-full shrink-0"
                          style={{ background: cfg.stripColor }}
                        />
                        <div>
                          <p className="font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                            {project.title}
                          </p>
                          {project.client && (
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {project.client.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">
                      {project.client?.name ?? (
                        <span className="italic opacity-50">Sans client</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                          cfg.className
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm hidden md:table-cell">
                      {total > 0 ? (
                        <span className="text-foreground">{formatAmount(total)}</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </td>
                    <td className="pr-4 py-3.5">
                      <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, filtered.length)} sur {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

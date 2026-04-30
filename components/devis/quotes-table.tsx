"use client"

import { useState, useMemo, useTransition, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Eye,
  Send,
  Copy,
  Archive,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  ChevronDown,
  Calendar,
  Bell,
  BellOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { QuoteForTable } from "@/types"
import type { QuoteStatus } from "@/types"

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "Brouillon",
    className:
      "bg-muted/60 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground",
  },
  sent: {
    label: "Envoyé",
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  accepted: {
    label: "Accepté",
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  rejected: {
    label: "Refusé",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
  expired: {
    label: "Expiré",
    className:
      "bg-slate-500/10 text-slate-500 border-slate-500/20",
    dot: "bg-slate-500",
  },
}

const ALL_STATUSES: QuoteStatus[] = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
]

const PER_PAGE = 15

type Props = { quotes: QuoteForTable[] }

export function QuotesTable({ quotes }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [statusFilters, setStatusFilters] = useState<QuoteStatus[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)

  const stats = useMemo(
    () =>
      ALL_STATUSES.reduce(
        (acc, s) => ({ ...acc, [s]: quotes.filter((q) => q.status === s).length }),
        {} as Record<QuoteStatus, number>
      ),
    [quotes]
  )

  const filtered = useMemo(() => {
    let result = quotes
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.reference?.toLowerCase().includes(q) ||
          r.project?.client?.name.toLowerCase().includes(q) ||
          r.project?.title.toLowerCase().includes(q)
      )
    }
    if (statusFilters.length > 0) {
      result = result.filter((r) => statusFilters.includes(r.status))
    }
    if (dateFrom) {
      result = result.filter((r) => r.created_at >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((r) => r.created_at <= dateTo + "T23:59:59")
    }
    return result
  }, [quotes, search, statusFilters, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleStatus = (s: QuoteStatus) => {
    setPage(1)
    setStatusFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilters([])
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const hasFilters =
    !!search || statusFilters.length > 0 || !!dateFrom || !!dateTo

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      const res = await fetch(`/api/devis/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success("Statut mis à jour")
        startTransition(() => router.refresh())
      } else {
        toast.error("Impossible de modifier le statut")
      }
    },
    [router]
  )

  const handleSend = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/devis/${id}/send`, { method: "POST" })
      if (res.ok) {
        toast.success("Devis envoyé par email")
        startTransition(() => router.refresh())
      } else {
        toast.error("Impossible d'envoyer le devis")
      }
    },
    [router]
  )

  const handleDuplicate = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/devis/${id}/duplicate`, { method: "POST" })
      if (res.ok) {
        const newQuote = await res.json() as { id: string }
        toast.success("Devis dupliqué")
        router.push(`/devis/${newQuote.id}/preview`)
      } else {
        toast.error("Impossible de dupliquer le devis")
      }
    },
    [router]
  )

  const handleArchive = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/devis/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      })
      if (res.ok) {
        toast.success("Devis archivé")
        startTransition(() => router.refresh())
      } else {
        toast.error("Impossible d'archiver le devis")
      }
    },
    [router]
  )

  const handleToggleReminders = useCallback(
    async (id: string, currentlyEnabled: boolean) => {
      const res = await fetch(`/api/devis/${id}/reminders`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      })
      if (res.ok) {
        toast.success(
          currentlyEnabled ? "Relances désactivées" : "Relances activées"
        )
        startTransition(() => router.refresh())
      } else {
        toast.error("Impossible de modifier les relances")
      }
    },
    [router]
  )

  return (
    <div className="space-y-4">
      {/* Status stat pills */}
      <div className="flex flex-wrap gap-2" data-testid="status-filters">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            data-testid={`status-filter-${s}`}
            aria-pressed={statusFilters.includes(s)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium border transition-all",
              STATUS_CONFIG[s].className,
              statusFilters.includes(s)
                ? "opacity-100 ring-1 ring-primary/40 shadow-sm"
                : "opacity-55 hover:opacity-80"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                STATUS_CONFIG[s].dot
              )}
            />
            {STATUS_CONFIG[s].label}
            <span className="font-mono tabular-nums opacity-80">
              {stats[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Référence, client, projet…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8 h-8 text-sm"
            data-testid="search-input"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none z-10" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              title="Date de début"
              className="h-8 pl-6 pr-2 text-xs bg-input border border-border rounded-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="date-from"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none z-10" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              title="Date de fin"
              className="h-8 pl-6 pr-2 text-xs bg-input border border-border rounded-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="date-to"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 gap-1.5 text-muted-foreground"
              data-testid="clear-filters"
            >
              <X className="size-3.5" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Result count */}
      {hasFilters && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} sur{" "}
          {quotes.length}
        </p>
      )}

      {/* Table */}
      <div className="rounded-sm border border-border overflow-hidden">
        <table
          className="w-full text-sm"
          data-testid="quotes-table"
        >
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">
                Référence
              </th>
              <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5">
                Client
              </th>
              <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 hidden md:table-cell">
                Projet
              </th>
              <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5">
                Statut
              </th>
              <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 hidden sm:table-cell">
                Total HT
              </th>
              <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 hidden lg:table-cell">
                Créé le
              </th>
              <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-12 rounded-sm bg-muted/40 flex items-center justify-center">
                      <FileText className="size-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Aucun devis trouvé
                    </p>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-primary hover:underline underline-offset-4"
                      >
                        Effacer les filtres
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((quote) => (
                <QuoteRow
                  key={quote.id}
                  quote={quote}
                  onStatusChange={handleStatusChange}
                  onSend={handleSend}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onToggleReminders={handleToggleReminders}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {filtered.length} devis · page {page} / {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Page précédente"
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "size-7 rounded-sm text-xs transition-colors",
                    page === pageNum
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {pageNum}
                </button>
              )
            })}

            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Page suivante"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QuoteRow
// ---------------------------------------------------------------------------

type RowProps = {
  quote: QuoteForTable
  onStatusChange: (id: string, status: string) => Promise<void>
  onSend: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onToggleReminders: (id: string, currentlyEnabled: boolean) => Promise<void>
}

function QuoteRow({
  quote,
  onStatusChange,
  onSend,
  onDuplicate,
  onArchive,
  onToggleReminders,
}: RowProps) {
  const remindersEnabled = quote.reminders_enabled ?? true
  const reference =
    quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
  const config = STATUS_CONFIG[quote.status]

  return (
    <tr
      data-testid="quotes-table-row"
      className="group hover:bg-primary/[0.04] transition-colors"
    >
      {/* Reference */}
      <td className="px-4 py-3">
        <Link
          href={`/devis/${quote.id}/preview`}
          data-testid="action-view"
          className="font-mono text-xs font-medium text-primary hover:underline underline-offset-4"
        >
          {reference}
        </Link>
      </td>

      {/* Client */}
      <td className="px-3 py-3 max-w-[180px]">
        <span className="text-sm text-foreground truncate block">
          {quote.project?.client?.name ?? "—"}
        </span>
      </td>

      {/* Project */}
      <td className="px-3 py-3 hidden md:table-cell max-w-[220px]">
        <span className="text-xs text-muted-foreground truncate block">
          {quote.project?.title ?? "—"}
        </span>
      </td>

      {/* Status — native select overlaid on badge */}
      <td className="px-3 py-3">
        <div
          className="relative inline-flex"
          data-testid="status-badge"
          data-status={quote.status}
        >
          <span
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-sm border font-medium select-none pointer-events-none",
              config.className
            )}
          >
            <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} />
            {config.label}
            <ChevronDown className="size-2.5 opacity-50" />
          </span>
          <select
            value={quote.status}
            onChange={(e) => onStatusChange(quote.id, e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Modifier le statut"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>
      </td>

      {/* Total HT */}
      <td className="px-3 py-3 hidden sm:table-cell text-right">
        <span className="font-mono text-xs text-foreground tabular-nums">
          {quote.total_ht != null
            ? new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
              }).format(quote.total_ht)
            : "—"}
        </span>
      </td>

      {/* Created at */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(quote.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <Link
            href={`/devis/${quote.id}/preview`}
            title="Voir le devis"
          >
            <span className="size-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <Eye className="size-3.5" />
            </span>
          </Link>

          <button
            onClick={() => onSend(quote.id)}
            title="Envoyer par email"
            className="size-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
            data-testid="action-send"
          >
            <Send className="size-3.5" />
          </button>

          <button
            onClick={() => onDuplicate(quote.id)}
            title="Dupliquer le devis"
            className="size-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10 transition-colors"
            data-testid="action-duplicate"
          >
            <Copy className="size-3.5" />
          </button>

          <button
            onClick={() => onArchive(quote.id)}
            title="Archiver le devis"
            className="size-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            data-testid="action-archive"
          >
            <Archive className="size-3.5" />
          </button>

          <button
            onClick={() => onToggleReminders(quote.id, remindersEnabled)}
            title={remindersEnabled ? "Désactiver les relances" : "Activer les relances"}
            data-testid="action-toggle-reminders"
            className={cn(
              "size-7 flex items-center justify-center rounded-sm transition-colors",
              remindersEnabled
                ? "text-sky-400 hover:text-sky-300 hover:bg-sky-400/10"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
            )}
          >
            {remindersEnabled ? (
              <Bell className="size-3.5" />
            ) : (
              <BellOff className="size-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  )
}

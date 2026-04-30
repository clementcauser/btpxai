"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Search,
  X,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Archive,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { EmailSummary, EmailStatusRecord, EmailStatus, EmailCategory } from "@/types"
import { EmailDetail } from "./email-detail"
import { clearClientSummaryCache } from "./client-summary-panel"

const CATEGORY_CONFIG: Record<
  EmailCategory,
  { label: string; color: string; bg: string }
> = {
  demande_devis: {
    label: "Devis",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/30",
  },
  suivi_commande: {
    label: "Suivi",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/30",
  },
  question: {
    label: "Question",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/30",
  },
  autre: {
    label: "Autre",
    color: "text-muted-foreground",
    bg: "bg-muted/30 border-border",
  },
}

type Client = { id: string; name: string; email: string | null }

type Props = {
  emails: EmailSummary[]
  initialStatuses: Record<string, EmailStatusRecord>
  clients: Client[]
}

type StatusFilter = EmailStatus | "all"

const STATUS_CONFIG: Record<
  EmailStatus,
  { label: string; color: string; bg: string; dot: string; icon: React.ElementType }
> = {
  a_traiter: {
    label: "À traiter",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/30",
    dot: "bg-amber-400",
    icon: AlertCircle,
  },
  en_cours: {
    label: "En cours",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    dot: "bg-blue-400",
    icon: Clock,
  },
  repondu: {
    label: "Répondu",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/30",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
  },
  archive: {
    label: "Archivé",
    color: "text-muted-foreground",
    bg: "bg-muted/30 border-border",
    dot: "bg-muted-foreground",
    icon: Archive,
  },
}

function getEffectiveStatus(
  email: EmailSummary,
  statuses: Record<string, EmailStatusRecord>
): EmailStatus {
  return statuses[email.id]?.status ?? (email.isRead ? "en_cours" : "a_traiter")
}

function formatDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr })
  } catch {
    return dateStr
  }
}

function parseSenderName(from: string): { name: string; address: string } {
  const match = from.match(/^(.+?)\s*<(.+)>$/)
  if (match) return { name: match[1].replace(/^["']|["']$/g, ""), address: match[2] }
  return { name: from, address: from }
}

export function EmailList({ emails, initialStatuses, clients }: Props) {
  const [statuses, setStatuses] =
    useState<Record<string, EmailStatusRecord>>(initialStatuses)
  const [classifications, setClassifications] = useState<Record<string, EmailCategory>>(() =>
    Object.entries(initialStatuses).reduce<Record<string, EmailCategory>>(
      (acc, [id, r]) => (r.category ? { ...acc, [id]: r.category } : acc),
      {}
    )
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    emails[0]?.id ?? null
  )
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all")
  const [, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("email_statuses_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_statuses" },
        (payload) => {
          const record = payload.new as EmailStatusRecord
          if (!record?.message_id) return
          setStatuses((prev) => ({ ...prev, [record.message_id]: record }))
          // Invalidate cached AI summary when a new email arrives for a client
          if (payload.eventType === "INSERT" && record.client_id) {
            clearClientSummaryCache(record.client_id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateStatus = useCallback(
    (email: EmailSummary, status: EmailStatus, clientId?: string | null) => {
      const optimistic: EmailStatusRecord = {
        id: statuses[email.id]?.id ?? "",
        message_id: email.id,
        thread_id: email.threadId,
        status,
        category: statuses[email.id]?.category ?? null,
        client_id: clientId !== undefined ? clientId : (statuses[email.id]?.client_id ?? null),
        created_at: statuses[email.id]?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setStatuses((prev) => ({ ...prev, [email.id]: optimistic }))

      startTransition(async () => {
        try {
          const res = await fetch(`/api/inbox/${email.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              threadId: email.threadId,
              status,
              clientId: clientId !== undefined ? clientId : (statuses[email.id]?.client_id ?? undefined),
            }),
          })
          if (!res.ok) throw new Error()
          const { record } = (await res.json()) as { record: EmailStatusRecord }
          setStatuses((prev) => ({ ...prev, [email.id]: record }))
        } catch {
          setStatuses((prev) => ({ ...prev }))
          toast.error("Impossible de mettre à jour le statut")
        }
      })
    },
    [statuses]
  )

  const counts = emails.reduce<Record<string, number>>(
    (acc, e) => {
      const s = getEffectiveStatus(e, statuses)
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    },
    {}
  )

  const filtered = emails.filter((e) => {
    if (activeFilter !== "all" && getEffectiveStatus(e, statuses) !== activeFilter)
      return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q)
      )
    }
    return true
  })

  const selectedEmail = emails.find((e) => e.id === selectedId) ?? null
  const selectedStatus = selectedId ? statuses[selectedId] : null

  return (
    <div className="flex flex-col gap-0 min-h-[600px]">
      {/* Status tabs */}
      <div
        data-testid="status-filters"
        className="flex items-center gap-px border border-border bg-card overflow-x-auto"
      >
        <button
          onClick={() => setActiveFilter("all")}
          data-testid="status-filter-all"
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-wider uppercase transition-colors shrink-0",
            activeFilter === "all"
              ? "bg-primary/10 text-primary border-r border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-r border-border"
          )}
        >
          <Circle className="size-2 fill-current" />
          Tous
          <span className="text-[10px] opacity-60">{emails.length}</span>
        </button>

        {(["a_traiter", "en_cours", "repondu", "archive"] as EmailStatus[]).map(
          (s) => {
            const cfg = STATUS_CONFIG[s]
            const Icon = cfg.icon
            const count = counts[s] ?? 0
            return (
              <button
                key={s}
                onClick={() =>
                  setActiveFilter((prev) => (prev === s ? "all" : s))
                }
                data-testid={`status-filter-${s}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-wider uppercase transition-colors shrink-0 border-r border-border",
                  activeFilter === s
                    ? cn(cfg.color, "bg-muted/60")
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="size-3" />
                {cfg.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[10px]",
                      activeFilter === s ? cfg.color : "opacity-50"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          }
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative flex items-center shrink-0 border-l border-border">
          <Search className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            data-testid="inbox-search"
            className="h-full bg-transparent pl-9 pr-8 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-44"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex border border-t-0 border-border overflow-hidden flex-1">
        {/* Email list */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 border-r border-border overflow-y-auto max-h-[calc(100vh-280px)]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
              <div className="size-10 rounded-sm border border-dashed border-border flex items-center justify-center">
                <Search className="size-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Aucun email{search ? " pour cette recherche" : " dans cette catégorie"}
              </p>
            </div>
          ) : (
            filtered.map((email) => {
              const isSelected = selectedId === email.id
              const status = getEffectiveStatus(email, statuses)
              const cfg = STATUS_CONFIG[status]
              const { name: senderName } = parseSenderName(email.from)
              const linkedClientId = statuses[email.id]?.client_id
              const linkedClient = linkedClientId
                ? clients.find((c) => c.id === linkedClientId)
                : null

              return (
                <button
                  key={email.id}
                  data-testid="inbox-email-row"
                  onClick={() => setSelectedId(email.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border transition-all relative group",
                    isSelected
                      ? "bg-primary/8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                      : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "size-1.5 rounded-full shrink-0 transition-colors",
                          cfg.dot
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm truncate font-medium",
                          !email.isRead
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {senderName}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {formatDate(email.date)}
                    </span>
                  </div>

                  <p
                    className={cn(
                      "text-xs truncate mb-1",
                      !email.isRead ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {email.subject || "(Sans objet)"}
                  </p>

                  <p className="text-[11px] text-muted-foreground truncate mb-2">
                    {email.snippet}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 border",
                        cfg.color,
                        cfg.bg
                      )}
                    >
                      {cfg.label}
                    </span>
                    {classifications[email.id] && (
                      <span
                        data-testid="classification-badge-list"
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 border",
                          CATEGORY_CONFIG[classifications[email.id]].color,
                          CATEGORY_CONFIG[classifications[email.id]].bg
                        )}
                      >
                        {CATEGORY_CONFIG[classifications[email.id]].label}
                      </span>
                    )}
                    {linkedClient && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 border border-border text-muted-foreground bg-muted/20">
                        {linkedClient.name}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 hidden lg:block overflow-hidden">
          {selectedId && selectedEmail ? (
            <EmailDetail
              key={selectedId}
              messageId={selectedId}
              email={selectedEmail}
              statusRecord={selectedStatus ?? null}
              clients={clients}
              onStatusChange={(status, clientId) =>
                updateStatus(selectedEmail, status, clientId)
              }
              onClassify={(category) =>
                setClassifications((prev) => ({ ...prev, [selectedId]: category }))
              }
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="size-12 rounded-sm border border-dashed border-border flex items-center justify-center">
                <Loader2 className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase">
                Sélectionnez un message
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

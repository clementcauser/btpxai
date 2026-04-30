"use client"

import { useState, useEffect } from "react"
import {
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  Zap,
  ChevronDown,
  ImageIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { MateriauxRequest, MateriauxStatus, MateriauxUrgency } from "@/types"

type ExtendedRequest = MateriauxRequest & {
  photo_url?: string | null
  comment?: string | null
  projects?: { title: string } | null
}

type Filter = "all" | MateriauxStatus

const URGENCY_META: Record<
  MateriauxUrgency,
  { label: string; borderColor: string; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  normal: {
    label: "Normal",
    borderColor: "oklch(0.35 0.015 258)",
    badgeBg: "oklch(0.20 0.010 258)",
    badgeText: "oklch(0.75 0.010 258)",
    badgeBorder: "oklch(0.35 0.010 258)",
  },
  urgent: {
    label: "Urgent",
    borderColor: "oklch(0.75 0.18 75)",
    badgeBg: "oklch(0.30 0.12 75)",
    badgeText: "oklch(0.90 0.14 75)",
    badgeBorder: "oklch(0.65 0.18 75)",
  },
  critique: {
    label: "Critique",
    borderColor: "oklch(0.62 0.22 25)",
    badgeBg: "oklch(0.25 0.12 25)",
    badgeText: "oklch(0.85 0.20 25)",
    badgeBorder: "oklch(0.55 0.22 25)",
  },
}

const STATUS_META: Record<
  MateriauxStatus,
  { label: string; nextLabel: string; next: MateriauxStatus | null; Icon: React.ElementType; color: string; actionBg: string }
> = {
  pending: {
    label: "En attente",
    nextLabel: "Marquer commandé",
    next: "ordered",
    Icon: Clock,
    color: "oklch(0.65 0.008 258)",
    actionBg: "oklch(0.25 0.09 230)",
  },
  ordered: {
    label: "Commandé",
    nextLabel: "Marquer livré",
    next: "delivered",
    Icon: Package,
    color: "oklch(0.70 0.16 230)",
    actionBg: "oklch(0.22 0.09 155)",
  },
  delivered: {
    label: "Livré",
    nextLabel: "",
    next: null,
    Icon: CheckCircle,
    color: "oklch(0.72 0.18 155)",
    actionBg: "",
  },
}

const FILTER_LABELS: Record<Filter, string> = {
  all: "Tout",
  pending: "En attente",
  ordered: "Commandé",
  delivered: "Livré",
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Il y a ${days}j`
}

export default function MateriauxDashboard({
  initialRequests,
}: {
  initialRequests: ExtendedRequest[]
}) {
  const [requests, setRequests] = useState<ExtendedRequest[]>(initialRequests)
  const [filter, setFilter] = useState<Filter>("all")
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const supabase = createClient()

  const pendingCount = requests.filter((r) => r.status === "pending").length

  useEffect(() => {
    const channel = supabase
      .channel("bureau-materiaux-all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "materiaux_requests" },
        (payload) => {
          const newReq = payload.new as ExtendedRequest
          setRequests((prev) => [newReq, ...prev])
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "materiaux_requests" },
        (payload) => {
          const updated = payload.new as ExtendedRequest
          setRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          )
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleStatusUpdate = async (id: string, next: MateriauxStatus) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/terrain/materiaux/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...(json.request as ExtendedRequest) } : r))
      )
    } finally {
      setUpdating(null)
    }
  }

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter)

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-black uppercase tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Demandes Matériaux
          </h1>
          {pendingCount > 0 && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-barlow)",
                background: "oklch(0.32 0.14 30)",
                color: "oklch(0.90 0.18 47)",
                border: "1px solid oklch(0.60 0.20 40)",
              }}
            >
              <AlertTriangle className="w-3 h-3" />
              {pendingCount} en attente
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-muted-foreground"}`}
            style={{ animation: isLive ? "pulse 2s infinite" : "none" }}
          />
          <span className="text-xs text-muted-foreground">
            {isLive ? "Temps réel" : "Connexion…"}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border pb-1">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const count = f === "all" ? requests.length : requests.filter((r) => r.status === f).length
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-barlow)",
                background: isActive ? "oklch(0.18 0.012 258)" : "transparent",
                color: isActive ? "oklch(0.92 0.008 78)" : "oklch(0.55 0.008 258)",
                border: isActive ? "1px solid oklch(0.35 0.012 258)" : "1px solid transparent",
              }}
            >
              {FILTER_LABELS[f]}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Package className="w-12 h-12 text-muted-foreground opacity-20 mb-3" />
          <p className="text-sm text-muted-foreground">Aucune demande</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((req) => {
            const urgMeta = URGENCY_META[req.urgency]
            const statusMeta = STATUS_META[req.status]
            const isUpdating = updating === req.id
            const StatusIcon = statusMeta.Icon

            return (
              <div
                key={req.id}
                className="bg-card border border-border rounded-sm overflow-hidden flex flex-col"
                style={{
                  borderLeftWidth: "3px",
                  borderLeftColor: urgMeta.borderColor,
                }}
              >
                {/* Card header */}
                <div className="p-4 flex-1 space-y-2">
                  <div className="flex items-start gap-2 justify-between">
                    <div className="min-w-0">
                      <p
                        className="font-black text-sm uppercase tracking-wide text-foreground leading-tight"
                        style={{ fontFamily: "var(--font-barlow)" }}
                      >
                        {req.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.quantity}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-sm border"
                      style={{
                        fontFamily: "var(--font-barlow)",
                        background: urgMeta.badgeBg,
                        color: urgMeta.badgeText,
                        borderColor: urgMeta.badgeBorder,
                      }}
                    >
                      {urgMeta.label}
                    </span>
                  </div>

                  {req.projects?.title && (
                    <p
                      className="text-[10px] uppercase tracking-widest text-muted-foreground"
                      style={{ fontFamily: "var(--font-barlow)" }}
                    >
                      {req.projects.title}
                    </p>
                  )}

                  {req.comment && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                      {req.comment}
                    </p>
                  )}

                  {/* Photo */}
                  {req.photo_url && (
                    <button
                      onClick={() =>
                        setExpandedPhoto(expandedPhoto === req.id ? null : req.id)
                      }
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Photo jointe
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${expandedPhoto === req.id ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}

                  {expandedPhoto === req.id && req.photo_url && (
                    <div className="rounded-sm overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={req.photo_url}
                        alt={req.label}
                        className="w-full object-cover"
                        style={{ maxHeight: "160px" }}
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5" style={{ color: statusMeta.color }}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ fontFamily: "var(--font-barlow)" }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(req.created_at)}
                    </span>
                  </div>

                  {statusMeta.next && (
                    <button
                      onClick={() => handleStatusUpdate(req.id, statusMeta.next!)}
                      disabled={isUpdating}
                      className="w-full flex items-center justify-center gap-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-opacity disabled:opacity-50"
                      style={{
                        height: "36px",
                        fontFamily: "var(--font-barlow)",
                        background: statusMeta.actionBg,
                        color: statusMeta.color,
                        border: `1px solid ${statusMeta.color}`,
                      }}
                    >
                      {isUpdating ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          {statusMeta.nextLabel}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

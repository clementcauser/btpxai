"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Clock, CheckCircle2, ChevronRight, Image as ImageIcon, Loader2 } from "lucide-react"
import type { AlerteTerrainWithProject, AlerteStatus } from "@/types"

type Props = {
  initialAlertes?: AlerteTerrainWithProject[]
}

const URGENCY_CONFIG = {
  faible: {
    label: "Faible",
    icon: "ℹ",
    border: "var(--alerte-faible-border)",
    bg: "var(--alerte-faible-bg)",
    badge: "var(--alerte-faible-badge)",
    badgeText: "var(--alerte-faible-badge-text)",
  },
  elevee: {
    label: "Élevée",
    icon: "⚠",
    border: "var(--alerte-elevee-border)",
    bg: "var(--alerte-elevee-bg)",
    badge: "var(--alerte-elevee-badge)",
    badgeText: "var(--alerte-elevee-badge-text)",
  },
  critique: {
    label: "Critique",
    icon: "🛑",
    border: "var(--alerte-critique-border)",
    bg: "var(--alerte-critique-bg)",
    badge: "var(--alerte-critique-badge)",
    badgeText: "var(--alerte-critique-badge-text)",
  },
}

const STATUS_CONFIG: Record<AlerteStatus, { label: string; color: string; icon: React.ElementType }> = {
  ouvert: { label: "Ouvert", color: "oklch(0.62 0.22 25)", icon: AlertTriangle },
  pris_en_charge: { label: "Pris en charge", color: "oklch(0.75 0.18 75)", icon: Clock },
  resolu: { label: "Résolu", color: "oklch(0.62 0.15 150)", icon: CheckCircle2 },
}

const NEXT_STATUS: Record<AlerteStatus, AlerteStatus | null> = {
  ouvert: "pris_en_charge",
  pris_en_charge: "resolu",
  resolu: null,
}

const NEXT_LABEL: Record<AlerteStatus, string> = {
  ouvert: "Prendre en charge",
  pris_en_charge: "Marquer résolu",
  resolu: "",
}

type Filter = "all" | AlerteStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "ouvert", label: "Ouvertes" },
  { id: "pris_en_charge", label: "En cours" },
  { id: "resolu", label: "Résolues" },
]

export default function AlertesFeed({ initialAlertes = [] }: Props) {
  const [alertes, setAlertes] = useState<AlerteTerrainWithProject[]>(initialAlertes)
  const [loading, setLoading] = useState(initialAlertes.length === 0)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)

  // Fetch client-side on mount so cy.intercept can mock the response in tests
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/terrain/alertes")
        if (!res.ok) return
        const data = await res.json() as { alertes: AlerteTerrainWithProject[] }
        if (!cancelled) setAlertes(data.alertes ?? [])
      } catch {
        // Keep initial state on network error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = filter === "all"
    ? alertes
    : alertes.filter((a: AlerteTerrainWithProject) => a.status === filter)

  const handleStatusUpdate = async (id: string, newStatus: AlerteStatus) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/terrain/alertes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      const { alerte } = await res.json() as { alerte: AlerteTerrainWithProject }
      setAlertes((prev: AlerteTerrainWithProject[]) =>
        prev.map((a: AlerteTerrainWithProject) => (a.id === id ? { ...a, ...alerte } : a))
      )
    } catch {
      // silently revert — user can retry
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="alertes-loading">
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: "oklch(0.45 0.008 258)" }}
        />
      </div>
    )
  }

  if (alertes.length === 0) {
    return (
      <div
        className="rounded-sm border border-border border-dashed bg-card/50 p-12 text-center"
        data-testid="alertes-empty"
      >
        <p className="text-sm font-medium text-muted-foreground">Aucune alerte</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Les signalements du terrain apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="alertes-feed">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = filter === f.id
          const count = f.id === "all"
            ? alertes.length
            : alertes.filter((a: AlerteTerrainWithProject) => a.status === f.id).length
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              data-testid={`filter-${f.id}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                fontFamily: "var(--font-barlow)",
                background: isActive ? "oklch(0.69 0.168 47 / 0.15)" : "var(--alerte-filter-bg)",
                color: isActive ? "oklch(0.69 0.168 47)" : "var(--alerte-filter-color)",
                border: `1px solid ${isActive ? "oklch(0.69 0.168 47 / 0.4)" : "var(--alerte-filter-border)"}`,
              }}
            >
              {f.label}
              <span
                className="flex items-center justify-center rounded-sm text-[10px] font-bold min-w-[18px] h-[18px] px-1"
                style={{
                  background: isActive ? "oklch(0.69 0.168 47 / 0.2)" : "var(--alerte-filter-badge-bg)",
                  color: isActive ? "oklch(0.9 0.15 47)" : "var(--alerte-filter-badge-color)",
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Alertes list */}
      {filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucune alerte dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alerte: AlerteTerrainWithProject) => {
            const urgConf = URGENCY_CONFIG[alerte.urgency]
            const statConf = STATUS_CONFIG[alerte.status]
            const nextStatus = NEXT_STATUS[alerte.status]
            const StatusIcon = statConf.icon
            const isUpdating = updating === alerte.id

            return (
              <article
                key={alerte.id}
                data-testid="alerte-card"
                className="rounded-sm overflow-hidden"
                style={{
                  background: urgConf.bg,
                  border: `1px solid ${urgConf.border}`,
                }}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-4">
                  <span className="text-xl leading-none pt-0.5 shrink-0">{urgConf.icon}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: urgConf.badge, color: urgConf.badgeText, fontFamily: "var(--font-barlow)" }}
                      >
                        {urgConf.label}
                      </span>

                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: `${statConf.color}22`,
                          color: statConf.color,
                          border: `1px solid ${statConf.color}44`,
                          fontFamily: "var(--font-barlow)",
                        }}
                        data-testid={`alerte-status-${alerte.id}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statConf.label}
                      </span>

                      {alerte.projects && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <ChevronRight className="w-3 h-3" />
                          {alerte.projects.title}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-foreground leading-relaxed">{alerte.description}</p>

                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(alerte.created_at).toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Photo thumbnail */}
                {alerte.photo_url && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => setExpandedPhoto(expandedPhoto === alerte.id ? null : alerte.id)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Voir la photo</span>
                    </button>
                    {expandedPhoto === alerte.id && (
                      <div className="mt-2 rounded-sm overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={alerte.photo_url}
                          alt="Photo du problème"
                          className="w-full max-h-56 object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Action button */}
                {nextStatus && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleStatusUpdate(alerte.id, nextStatus)}
                      disabled={isUpdating}
                      data-testid={`action-alerte-${alerte.id}`}
                      className="flex items-center justify-center gap-2 w-full rounded-sm font-bold uppercase tracking-wider disabled:opacity-50 transition-all active:scale-[0.98]"
                      style={{
                        height: "44px",
                        fontFamily: "var(--font-barlow)",
                        fontSize: "12px",
                        background: nextStatus === "resolu" ? "var(--alerte-action-resolu-bg)" : "var(--alerte-action-pec-bg)",
                        color: nextStatus === "resolu" ? "var(--alerte-action-resolu-color)" : "var(--alerte-action-pec-color)",
                        border: `1px solid ${nextStatus === "resolu" ? "var(--alerte-action-resolu-border)" : "var(--alerte-action-pec-border)"}`,
                      }}
                    >
                      {isUpdating ? "Mise à jour…" : NEXT_LABEL[alerte.status]}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

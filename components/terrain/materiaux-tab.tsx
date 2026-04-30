"use client"

import { useState } from "react"
import { Send, Clock, Package, CheckCircle, PackageSearch } from "lucide-react"
import type { MateriauxRequest, MateriauxUrgency, MateriauxStatus } from "@/types"

const URGENCY_CONFIG: Record<
  MateriauxUrgency,
  { label: string; activeBg: string; activeText: string; activeBorder: string }
> = {
  normal: {
    label: "Normal",
    activeBg: "oklch(0.23 0.012 258)",
    activeText: "oklch(0.92 0.012 78)",
    activeBorder: "oklch(0.45 0.008 258)",
  },
  urgent: {
    label: "Urgent",
    activeBg: "oklch(0.35 0.12 75)",
    activeText: "oklch(0.9 0.14 75)",
    activeBorder: "oklch(0.75 0.18 75)",
  },
  critique: {
    label: "Critique",
    activeBg: "oklch(0.28 0.12 25)",
    activeText: "oklch(0.85 0.2 25)",
    activeBorder: "oklch(0.62 0.22 25)",
  },
}

const STATUS_CONFIG: Record<
  MateriauxStatus,
  { label: string; Icon: React.ElementType; color: string }
> = {
  pending: { label: "En attente", Icon: Clock, color: "text-muted-foreground" },
  ordered: { label: "Commandé", Icon: Package, color: "text-primary" },
  delivered: { label: "Livré", Icon: CheckCircle, color: "text-emerald-500" },
}

export default function MateriauxTab({ projectId }: { projectId: string }) {
  const [label, setLabel] = useState("")
  const [quantity, setQuantity] = useState("")
  const [urgency, setUrgency] = useState<MateriauxUrgency>("normal")
  const [requests, setRequests] = useState<MateriauxRequest[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = label.trim().length > 0 && quantity.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)

    const request: MateriauxRequest = {
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: "",
      label: label.trim(),
      quantity: quantity.trim(),
      urgency,
      status: "pending",
      created_at: new Date().toISOString(),
    }

    setRequests((prev) => [request, ...prev])
    setLabel("")
    setQuantity("")
    setUrgency("normal")
    setIsSubmitting(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-barlow)" }}
        >
          Nouvelle demande
        </p>

        <input
          type="text"
          placeholder="Matériau (ex : Acier S235, profilé IPE)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          data-testid="materiau-label"
          className="w-full bg-input border border-border rounded-sm px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ height: "48px" }}
        />

        <input
          type="text"
          placeholder="Quantité (ex : 5 barres, 20 kg)"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full bg-input border border-border rounded-sm px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ height: "48px" }}
        />

        <div className="flex gap-2">
          {(Object.keys(URGENCY_CONFIG) as MateriauxUrgency[]).map((level) => {
            const cfg = URGENCY_CONFIG[level]
            const isActive = urgency === level
            return (
              <button
                key={level}
                onClick={() => setUrgency(level)}
                className="flex-1 rounded-sm border font-bold uppercase tracking-wide transition-colors"
                style={{
                  height: "40px",
                  fontFamily: "var(--font-barlow)",
                  fontSize: "11px",
                  background: isActive ? cfg.activeBg : "transparent",
                  color: isActive ? cfg.activeText : "oklch(0.58 0.008 258)",
                  borderColor: isActive
                    ? cfg.activeBorder
                    : "oklch(0.29 0.012 258)",
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          data-testid="submit-materiau"
          className="w-full flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider disabled:opacity-40 active:scale-[0.97] transition-transform"
          style={{
            height: "56px",
            fontFamily: "var(--font-barlow)",
            background: "oklch(0.69 0.168 47)",
            color: "oklch(0.11 0.008 258)",
          }}
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? "Envoi…" : "Envoyer la demande"}
        </button>
      </div>

      {requests.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Demandes en cours
          </p>
          {requests.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status]
            const urgencyCfg = URGENCY_CONFIG[req.urgency]
            return (
              <div
                key={req.id}
                className="bg-card border border-border rounded-sm p-4"
                style={{ animation: "fadeSlideIn 0.25s ease both" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="font-bold text-sm uppercase tracking-wide text-foreground truncate"
                      style={{ fontFamily: "var(--font-barlow)" }}
                    >
                      {req.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.quantity}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider shrink-0 px-2 py-1 rounded-sm border"
                    style={{
                      fontFamily: "var(--font-barlow)",
                      color: urgencyCfg.activeText,
                      borderColor: urgencyCfg.activeBorder,
                      background: urgencyCfg.activeBg,
                    }}
                  >
                    {urgencyCfg.label}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 mt-3 ${statusCfg.color}`}>
                  <statusCfg.Icon className="w-3 h-3" />
                  <span className="text-xs">{statusCfg.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {requests.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <PackageSearch className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucune demande en cours</p>
        </div>
      )}
    </div>
  )
}

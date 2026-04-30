"use client"

import { useState, useEffect, useRef } from "react"
import {
  Send,
  Clock,
  Package,
  CheckCircle,
  PackageSearch,
  Camera,
  X,
  MessageSquare,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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

type ExtendedRequest = MateriauxRequest & { photo_url?: string | null; comment?: string | null }

export default function MateriauxTab({ projectId }: { projectId: string }) {
  const [label, setLabel] = useState("")
  const [quantity, setQuantity] = useState("")
  const [urgency, setUrgency] = useState<MateriauxUrgency>("normal")
  const [comment, setComment] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [requests, setRequests] = useState<ExtendedRequest[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const canSubmit = label.trim().length > 0 && quantity.trim().length > 0

  // Load existing requests on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/terrain/materiaux?project_id=${projectId}`)
        if (res.ok) {
          const json = await res.json()
          setRequests(json.requests ?? [])
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  // Subscribe to realtime status updates from bureau
  useEffect(() => {
    const channel = supabase
      .channel(`materiaux-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "materiaux_requests",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as ExtendedRequest
          setRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  const clearPhoto = () => {
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)

    // Optimistic update
    const tempId = crypto.randomUUID()
    const optimistic: ExtendedRequest = {
      id: tempId,
      project_id: projectId,
      user_id: "",
      label: label.trim(),
      quantity: quantity.trim(),
      urgency,
      comment: comment.trim() || null,
      photo_url: photoPreview ?? null,
      status: "pending",
      created_at: new Date().toISOString(),
    }
    setRequests((prev) => [optimistic, ...prev])

    const savedLabel = label.trim()
    const savedQuantity = quantity.trim()
    const savedUrgency = urgency
    const savedComment = comment.trim()
    const savedPhoto = photo

    setLabel("")
    setQuantity("")
    setUrgency("normal")
    setComment("")
    clearPhoto()

    try {
      const fd = new FormData()
      fd.append("project_id", projectId)
      fd.append("label", savedLabel)
      fd.append("quantity", savedQuantity)
      fd.append("urgency", savedUrgency)
      if (savedComment) fd.append("comment", savedComment)
      if (savedPhoto) fd.append("photo", savedPhoto)

      const res = await fetch("/api/terrain/materiaux", { method: "POST", body: fd })
      if (!res.ok) throw new Error("API error")
      const json = await res.json()

      setRequests((prev) =>
        prev.map((r) => (r.id === tempId ? (json.request as ExtendedRequest) : r))
      )
    } catch {
      // Rollback optimistic update
      setRequests((prev) => prev.filter((r) => r.id !== tempId))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Form */}
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
          data-testid="materiau-quantity"
          className="w-full bg-input border border-border rounded-sm px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ height: "48px" }}
        />

        {/* Urgency */}
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
                  borderColor: isActive ? cfg.activeBorder : "oklch(0.29 0.012 258)",
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Comment (optional) */}
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <textarea
            placeholder="Commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            data-testid="materiau-comment"
            rows={2}
            className="w-full bg-input border border-border rounded-sm pl-9 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>

        {/* Photo capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
          data-testid="materiau-photo-input"
        />

        {photoPreview ? (
          <div className="relative rounded-sm overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Aperçu"
              className="w-full object-cover"
              style={{ maxHeight: "160px" }}
            />
            <button
              onClick={clearPhoto}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 border border-border"
              style={{ width: "32px", height: "32px" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            data-testid="materiau-photo-button"
            className="w-full flex items-center justify-center gap-2 rounded-sm border border-dashed border-border text-muted-foreground text-sm"
            style={{ height: "48px", fontFamily: "var(--font-barlow)" }}
          >
            <Camera className="w-4 h-4" />
            Photo du matériau (optionnel)
          </button>
        )}

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

      {/* Request list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : requests.length > 0 ? (
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
                    <p className="text-xs text-muted-foreground mt-0.5">{req.quantity}</p>
                    {req.comment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{req.comment}</p>
                    )}
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

                {req.photo_url && (
                  <div className="mt-3 rounded-sm overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={req.photo_url}
                      alt={req.label}
                      className="w-full object-cover"
                      style={{ maxHeight: "120px" }}
                    />
                  </div>
                )}

                <div className={`flex items-center gap-1.5 mt-3 ${statusCfg.color}`}>
                  <statusCfg.Icon className="w-3 h-3" />
                  <span className="text-xs">{statusCfg.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-center">
          <PackageSearch className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucune demande en cours</p>
        </div>
      )}
    </div>
  )
}

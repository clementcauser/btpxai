"use client"

import { useState, useRef } from "react"
import { AlertTriangle, Send, RotateCcw, Camera, X } from "lucide-react"
import { toast } from "sonner"
import type { ProblemeUrgency } from "@/types"

type UrgencyOption = {
  level: ProblemeUrgency
  label: string
  sub: string
  activeBg: string
  activeText: string
  activeBorder: string
  icon: string
}

const URGENCY_OPTIONS: UrgencyOption[] = [
  {
    level: "faible",
    label: "Faible",
    sub: "Information",
    icon: "ℹ",
    activeBg: "oklch(0.23 0.012 258)",
    activeText: "oklch(0.92 0.012 78)",
    activeBorder: "oklch(0.55 0.008 258)",
  },
  {
    level: "elevee",
    label: "Élevée",
    sub: "Traiter vite",
    icon: "⚠",
    activeBg: "oklch(0.32 0.1 75)",
    activeText: "oklch(0.92 0.14 75)",
    activeBorder: "oklch(0.75 0.18 75)",
  },
  {
    level: "critique",
    label: "Critique",
    sub: "Arrêt chantier",
    icon: "🛑",
    activeBg: "oklch(0.28 0.14 25)",
    activeText: "oklch(0.92 0.2 25)",
    activeBorder: "oklch(0.62 0.22 25)",
  },
]

export default function ProblemeTab({ projectId }: { projectId: string }) {
  const [urgency, setUrgency] = useState<ProblemeUrgency | null>(null)
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = urgency !== null && description.trim().length > 0

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)

    try {
      const fd = new FormData()
      fd.append("project_id", projectId)
      fd.append("urgency", urgency!)
      fd.append("description", description.trim())
      if (photo) fd.append("photo", photo)

      const res = await fetch("/api/terrain/alertes", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Erreur serveur")

      setSubmitted(true)
    } catch {
      toast.error("Impossible d'envoyer l'alerte. Réessayez.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setUrgency(null)
    setDescription("")
    setPhoto(null)
    setPhotoPreview(null)
  }

  if (submitted) {
    return (
      <div
        className="p-4 flex flex-col items-center text-center pt-16"
        style={{ animation: "fadeSlideIn 0.3s ease both" }}
      >
        <div
          className="w-20 h-20 rounded-sm flex items-center justify-center mb-5"
          style={{ background: "oklch(0.22 0.04 47 / 0.3)" }}
        >
          <AlertTriangle
            className="w-10 h-10"
            style={{ color: "oklch(0.69 0.168 47)" }}
          />
        </div>
        <h2
          className="text-2xl font-bold uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-barlow)",
            color: "oklch(0.92 0.012 78)",
          }}
        >
          Signalement envoyé
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Le bureau a été notifié immédiatement.
          <br />
          Restez disponible pour le suivi.
        </p>
        <button
          onClick={handleReset}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-transform"
          style={{
            height: "56px",
            fontFamily: "var(--font-barlow)",
            background: "oklch(0.23 0.012 258)",
            color: "oklch(0.92 0.012 78)",
            border: "1px solid oklch(0.29 0.012 258)",
          }}
        >
          <RotateCcw className="w-4 h-4" />
          Nouveau signalement
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="w-5 h-5 shrink-0"
          style={{ color: "oklch(0.62 0.22 25)" }}
        />
        <h2
          className="text-xl font-bold uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-barlow)",
            color: "oklch(0.92 0.012 78)",
          }}
        >
          Signaler un problème
        </h2>
      </div>

      {/* Urgency selector */}
      <div className="space-y-2">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-barlow)" }}
        >
          Niveau d&apos;urgence
        </p>
        <div className="grid grid-cols-3 gap-2">
          {URGENCY_OPTIONS.map((opt) => {
            const isActive = urgency === opt.level
            return (
              <button
                key={opt.level}
                onClick={() => setUrgency(opt.level)}
                data-testid={`urgency-${opt.level}`}
                className="flex flex-col items-center justify-center gap-1 rounded-sm border transition-all active:scale-95"
                style={{
                  minHeight: "72px",
                  padding: "10px 6px",
                  background: isActive ? opt.activeBg : "transparent",
                  borderColor: isActive
                    ? opt.activeBorder
                    : "oklch(0.29 0.012 258)",
                }}
              >
                <span className="text-lg leading-none">{opt.icon}</span>
                <span
                  className="text-xs font-bold uppercase tracking-wide leading-none"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    color: isActive ? opt.activeText : "oklch(0.92 0.012 78)",
                  }}
                >
                  {opt.label}
                </span>
                <span
                  className="text-[9px] text-center leading-tight"
                  style={{ color: "oklch(0.55 0.008 258)" }}
                >
                  {opt.sub}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-barlow)" }}
        >
          Description
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez précisément le problème rencontré…"
          rows={4}
          data-testid="probleme-description"
          className="w-full bg-input border border-border rounded-sm px-3 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Photo optionnelle */}
      <div className="space-y-2">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-barlow)" }}
        >
          Photo (optionnel)
        </p>
        {photoPreview ? (
          <div className="relative rounded-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Aperçu du problème"
              className="w-full h-40 object-cover"
            />
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null) }}
              className="absolute top-2 right-2 flex items-center justify-center rounded-sm"
              style={{ width: "32px", height: "32px", background: "oklch(0.15 0.008 258 / 0.85)" }}
              aria-label="Supprimer la photo"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-sm border border-dashed transition-colors active:scale-[0.98]"
            style={{
              height: "56px",
              borderColor: "oklch(0.29 0.012 258)",
              color: "oklch(0.55 0.008 258)",
            }}
          >
            <Camera className="w-5 h-5" />
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              Ajouter une photo
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
          data-testid="probleme-photo-input"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        data-testid="submit-probleme"
        className="w-full flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider disabled:opacity-40 active:scale-[0.97] transition-transform"
        style={{
          height: "56px",
          fontFamily: "var(--font-barlow)",
          background: "oklch(0.62 0.22 25)",
          color: "white",
        }}
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? "Envoi en cours…" : "Signaler au bureau"}
      </button>
    </div>
  )
}

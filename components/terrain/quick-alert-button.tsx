"use client"

import { useState, useRef } from "react"
import { AlertTriangle, X, Send, Camera, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import type { ProblemeUrgency } from "@/types"

type UrgencyOption = {
  level: ProblemeUrgency
  label: string
  sub: string
  icon: string
  activeBg: string
  activeText: string
  activeBorder: string
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

export default function QuickAlertButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [urgency, setUrgency] = useState<ProblemeUrgency | null>(null)
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = urgency !== null && description.trim().length > 0

  const handleOpen = () => {
    setIsOpen(true)
    setSubmitted(false)
    setUrgency(null)
    setDescription("")
    setPhoto(null)
    setPhotoPreview(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    setIsOpen(false)
  }

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
      fd.append("urgency", urgency!)
      fd.append("description", description.trim())
      if (photo) fd.append("photo", photo)

      const res = await fetch("/api/terrain/alertes", { method: "POST", body: fd })
      if (!res.ok) throw new Error()

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

  return (
    <>
      {/* Floating quick-alert trigger */}
      <button
        onClick={handleOpen}
        data-testid="quick-alert-button"
        aria-label="Signaler une alerte"
        className="w-full flex items-center justify-center gap-3 rounded-sm font-bold uppercase tracking-widest transition-all active:scale-[0.97]"
        style={{
          minHeight: "64px",
          background: "oklch(0.55 0.22 25)",
          color: "white",
          fontFamily: "var(--font-barlow)",
          fontSize: "1rem",
          letterSpacing: "0.12em",
          boxShadow: "0 0 0 0 oklch(0.62 0.22 25)",
          animation: "alertPulse 2.4s ease infinite",
        }}
      >
        <AlertTriangle className="w-6 h-6" style={{ flexShrink: 0 }} />
        <span>Signaler une alerte</span>
      </button>

      {/* Overlay + bottom sheet */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "oklch(0 0 0 / 0.72)" }}
            onClick={handleClose}
            data-testid="alert-overlay"
          />

          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-lg overflow-hidden flex flex-col"
            style={{
              background: "oklch(0.105 0.008 258)",
              borderTop: "1px solid oklch(0.29 0.012 258)",
              maxHeight: "92dvh",
              animation: "slideUp 0.28s cubic-bezier(0.34,1.12,0.64,1) both",
            }}
          >
            {/* Sheet header */}
            <div
              className="flex items-center justify-between px-4 py-4 shrink-0"
              style={{ borderBottom: "1px solid oklch(0.18 0.008 258)" }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="w-5 h-5"
                  style={{ color: "oklch(0.62 0.22 25)" }}
                />
                <h2
                  className="text-lg font-bold uppercase tracking-wide"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    color: "oklch(0.92 0.012 78)",
                  }}
                >
                  Alerte rapide
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="flex items-center justify-center rounded-sm"
                style={{
                  width: "40px",
                  height: "40px",
                  background: "oklch(0.18 0.008 258)",
                  border: "1px solid oklch(0.25 0.008 258)",
                }}
                aria-label="Fermer"
                data-testid="close-alert-sheet"
              >
                <X className="w-4 h-4" style={{ color: "oklch(0.55 0.008 258)" }} />
              </button>
            </div>

            {/* Sheet content */}
            <div className="overflow-y-auto flex-1 p-4" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
              {submitted ? (
                <div
                  className="flex flex-col items-center text-center py-10"
                  style={{ animation: "fadeSlideIn 0.3s ease both" }}
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                    style={{ background: "oklch(0.22 0.14 25 / 0.4)" }}
                  >
                    <AlertTriangle
                      className="w-10 h-10"
                      style={{ color: "oklch(0.62 0.22 25)" }}
                    />
                  </div>
                  <h3
                    className="text-2xl font-bold uppercase tracking-wide mb-2"
                    style={{ fontFamily: "var(--font-barlow)", color: "oklch(0.92 0.012 78)" }}
                  >
                    Alerte envoyée
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                    Le bureau a été notifié immédiatement.
                    <br />
                    Restez disponible pour le suivi.
                  </p>
                  <div className="w-full space-y-3">
                    <button
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-transform"
                      style={{
                        height: "52px",
                        fontFamily: "var(--font-barlow)",
                        background: "oklch(0.23 0.012 258)",
                        color: "oklch(0.92 0.012 78)",
                        border: "1px solid oklch(0.29 0.012 258)",
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Nouvelle alerte
                    </button>
                    <button
                      onClick={handleClose}
                      className="w-full flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-transform"
                      style={{
                        height: "52px",
                        fontFamily: "var(--font-barlow)",
                        background: "transparent",
                        color: "oklch(0.55 0.008 258)",
                        border: "1px solid oklch(0.22 0.008 258)",
                      }}
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Urgency */}
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
                            data-testid={`quick-urgency-${opt.level}`}
                            className="flex flex-col items-center justify-center gap-1 rounded-sm border transition-all active:scale-95"
                            style={{
                              minHeight: "72px",
                              padding: "10px 6px",
                              background: isActive ? opt.activeBg : "transparent",
                              borderColor: isActive ? opt.activeBorder : "oklch(0.29 0.012 258)",
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
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                      placeholder="Décrivez le problème rencontré…"
                      rows={3}
                      data-testid="quick-alert-description"
                      className="w-full bg-input border border-border rounded-sm px-3 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm leading-relaxed"
                    />
                  </div>

                  {/* Photo */}
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
                          alt="Aperçu"
                          className="w-full h-36 object-cover"
                        />
                        <button
                          onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                          className="absolute top-2 right-2 flex items-center justify-center rounded-sm"
                          style={{ width: "32px", height: "32px", background: "oklch(0.1 0.008 258 / 0.85)" }}
                          aria-label="Supprimer la photo"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 rounded-sm border border-dashed active:scale-[0.98] transition-colors"
                        style={{
                          height: "52px",
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
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    data-testid="submit-quick-alert"
                    className="w-full flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider disabled:opacity-40 active:scale-[0.97] transition-transform"
                    style={{
                      height: "56px",
                      fontFamily: "var(--font-barlow)",
                      background: "oklch(0.62 0.22 25)",
                      color: "white",
                    }}
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? "Envoi en cours…" : "Envoyer l'alerte"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

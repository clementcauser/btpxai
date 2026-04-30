"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Camera, ImageOff, MapPin, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import type { TerrainPhoto } from "@/types"

type UploadState = "idle" | "compressing" | "uploading" | "done" | "error"

type PhotoEntry = TerrainPhoto & {
  localUrl?: string
  uploadState?: UploadState
}

async function compressImage(file: File, maxDimension = 1280, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(maxDimension / img.width, maxDimension / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("canvas context unavailable"))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("compression échouée"))
        },
        "image/jpeg",
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("chargement image échoué")) }
    img.src = url
  })
}

function getGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000 }
    )
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

type StatusBadgeProps = { state: UploadState }
function StatusBadge({ state }: StatusBadgeProps) {
  if (state === "uploading" || state === "compressing") {
    return (
      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/60 text-white text-[10px] rounded-sm px-1.5 py-0.5 backdrop-blur-sm">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        {state === "compressing" ? "Compression…" : "Envoi…"}
      </span>
    )
  }
  if (state === "done") {
    return (
      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-emerald-500/80 text-white text-[10px] rounded-sm px-1.5 py-0.5 backdrop-blur-sm">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Envoyé
      </span>
    )
  }
  if (state === "error") {
    return (
      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-red-500/80 text-white text-[10px] rounded-sm px-1.5 py-0.5 backdrop-blur-sm">
        <AlertCircle className="w-2.5 h-2.5" />
        Erreur
      </span>
    )
  }
  return null
}

export default function PhotosTab({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load persisted photos on mount
  useEffect(() => {
    fetch(`/api/terrain/photos?project_id=${projectId}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(({ photos: remote }: { photos: TerrainPhoto[] }) => {
        setPhotos(remote.map((p) => ({ ...p, uploadState: "done" as UploadState })))
      })
      .catch(() => {/* non-blocking */})
      .finally(() => setIsLoading(false))
  }, [projectId])

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const tempId = crypto.randomUUID()
    const localUrl = URL.createObjectURL(file)
    const now = new Date().toISOString()

    // Optimistic entry
    setPhotos((prev) => [{
      id: tempId,
      project_id: projectId,
      user_id: "",
      photo_url: "",
      lat: null,
      lng: null,
      created_at: now,
      localUrl,
      uploadState: "compressing",
    }, ...prev])

    try {
      const [compressed, geo] = await Promise.all([
        compressImage(file),
        getGeolocation(),
      ])

      setPhotos((prev) => prev.map((p) =>
        p.id === tempId ? { ...p, uploadState: "uploading" } : p
      ))

      const fd = new FormData()
      fd.append("project_id", projectId)
      fd.append("photo", compressed, "photo.jpg")
      if (geo) {
        fd.append("lat", String(geo.lat))
        fd.append("lng", String(geo.lng))
      }

      const res = await fetch("/api/terrain/photos", { method: "POST", body: fd })
      if (!res.ok) throw new Error("upload failed")

      const { photo }: { photo: TerrainPhoto } = await res.json()

      setPhotos((prev) => prev.map((p) =>
        p.id === tempId
          ? { ...photo, localUrl, uploadState: "done" }
          : p
      ))
    } catch {
      setPhotos((prev) => prev.map((p) =>
        p.id === tempId ? { ...p, uploadState: "error" } : p
      ))
    }
  }, [projectId])

  return (
    <div className="p-4 space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        aria-label="Prendre une photo"
      />

      <button
        onClick={() => inputRef.current?.click()}
        data-testid="photo-button"
        className="w-full flex items-center justify-center gap-3 rounded-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-transform"
        style={{
          height: "56px",
          fontFamily: "var(--font-barlow)",
          background: "oklch(0.69 0.168 47)",
          color: "oklch(0.11 0.008 258)",
        }}
      >
        <Camera className="w-5 h-5" />
        Prendre une photo
      </button>

      {isLoading && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {!isLoading && photos.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            {photos.length} photo{photos.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-sm overflow-hidden bg-muted border border-border"
                style={{ animation: "fadeSlideIn 0.25s ease both" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.localUrl ?? photo.photo_url}
                  alt={`Photo ${formatDate(photo.created_at)} ${formatTime(photo.created_at)}`}
                  className="w-full h-full object-cover"
                  style={{ opacity: photo.uploadState === "done" ? 1 : 0.75 }}
                />

                <StatusBadge state={photo.uploadState ?? "done"} />

                {/* Timestamp + geo strip */}
                <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
                  <p className="text-white text-[10px] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 opacity-70" />
                    {formatDate(photo.created_at)} {formatTime(photo.created_at)}
                  </p>
                  {photo.lat && photo.lng && (
                    <p className="text-white/70 text-[9px] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2 h-2" />
                      {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && photos.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <ImageOff className="w-10 h-10 text-muted-foreground opacity-30 mb-3 pointer-events-none" />
          <p className="text-sm text-muted-foreground">
            Aucune photo pour ce chantier
          </p>
        </div>
      )}
    </div>
  )
}

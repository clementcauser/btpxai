"use client"

import { useRef, useState } from "react"
import { Camera, ImageOff } from "lucide-react"

type PhotoEntry = {
  id: string
  url: string
  createdAt: string
}

export default function PhotosTab({ projectId: _projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotos((prev) => [
      { id: crypto.randomUUID(), url, createdAt: new Date().toISOString() },
      ...prev,
    ])
    e.target.value = ""
  }

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

      {photos.length > 0 && (
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
                className="aspect-square rounded-sm overflow-hidden bg-muted border border-border"
                style={{ animation: "fadeSlideIn 0.25s ease both" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Photo ${new Date(photo.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <ImageOff className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune photo pour ce chantier
          </p>
        </div>
      )}
    </div>
  )
}

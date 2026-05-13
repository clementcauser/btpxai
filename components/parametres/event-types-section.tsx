"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CalendarEventType } from "@/types"

interface EventTypesSectionProps {
  initialTypes: CalendarEventType[]
}

const COLOR_PRESETS = [
  "#3b82f6", "#ec4899", "#8b5cf6", "#f97316",
  "#06b6d4", "#f59e0b", "#22c55e", "#6b7280", "#a3a3a3",
]

export function EventTypesSection({ initialTypes }: EventTypesSectionProps) {
  const [types, setTypes] = useState(initialTypes)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editColor, setEditColor] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/calendar/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      const created = await res.json()
      setTypes((prev) => [...prev, created])
      setNewLabel("")
      setNewColor(COLOR_PRESETS[0])
      setShowAdd(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar/event-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel, color: editColor }),
      })
      if (!res.ok) throw new Error("Erreur")
      const updated = await res.json()
      setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)))
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/calendar/event-types/${id}`, { method: "DELETE" })
    if (res.status === 409) {
      setError("Ce type est utilisé par des événements existants et ne peut pas être supprimé.")
      return
    }
    if (!res.ok) { setError("Erreur lors de la suppression"); return }
    setTypes((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Types d&apos;événements</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Catégories disponibles lors de la création d&apos;un événement calendrier
          </p>
        </div>
        {!showAdd && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="size-3.5 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {showAdd && (
        <div className="flex items-end gap-3 p-3 border border-border rounded-md bg-muted/30">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Nom</Label>
            <Input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Réunion fournisseur"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Couleur</Label>
            <div className="flex gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                    newColor === c ? "ring-2 ring-offset-1 ring-foreground scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newLabel.trim()}>
              {saving ? "..." : "Créer"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/20">
            {editingId === t.id ? (
              <>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-7 text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(t.id)}
                />
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-4 h-4 rounded-full ${editColor === c ? "ring-2 ring-offset-1 ring-foreground" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                <Button size="sm" onClick={() => handleUpdate(t.id)} disabled={saving}>OK</Button>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-sm flex-1">{t.label}</span>
                {t.is_preset && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    preset
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { setEditingId(t.id); setEditLabel(t.label); setEditColor(t.color) }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  ListChecks,
  Activity,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { ProjectStep } from "@/types"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return formatDateTime(iso)
}

type NewlyCompletedId = string

export default function ProjectStepsManager({ projectId }: { projectId: string }) {
  const [steps, setSteps] = useState<ProjectStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [newlyCompleted, setNewlyCompleted] = useState<Set<NewlyCompletedId>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const completedCount = steps.filter((s) => s.completed_at !== null).length
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/project-steps?project_id=${projectId}`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        setSteps((json.steps ?? []) as ProjectStep[])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  useEffect(() => {
    const channel = supabase
      .channel(`project-steps-bureau-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_steps",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const step = payload.new as ProjectStep
          setSteps((prev) =>
            [...prev, step].sort((a, b) => a.order - b.order)
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "project_steps",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as ProjectStep
          setSteps((prev) => {
            const old = prev.find((s) => s.id === updated.id)
            // Highlight step when completed by ouvrier
            if (updated.completed_at && !old?.completed_at) {
              setNewlyCompleted((nc) => {
                const next = new Set(nc)
                next.add(updated.id)
                setTimeout(() => {
                  setNewlyCompleted((nc2) => {
                    const n = new Set(nc2)
                    n.delete(updated.id)
                    return n
                  })
                }, 3000)
                return next
              })
            }
            return prev.map((s) => (s.id === updated.id ? updated : s))
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "project_steps",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string }
          setSteps((prev) => prev.filter((s) => s.id !== deleted.id))
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  const handleAddStep = async () => {
    const label = newLabel.trim()
    if (!label || isAdding) return
    setIsAdding(true)

    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order)) + 1 : 1
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: ProjectStep = {
      id: tempId,
      project_id: projectId,
      label,
      order: nextOrder,
      completed_at: null,
      completed_by: null,
      workspace_id: "",
    }

    setSteps((prev) => [...prev, optimistic])
    setNewLabel("")

    try {
      const res = await fetch("/api/project-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, label, order: nextOrder }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSteps((prev) =>
        prev.map((s) => (s.id === tempId ? (json.step as ProjectStep) : s))
      )
    } catch {
      setSteps((prev) => prev.filter((s) => s.id !== tempId))
      setNewLabel(label)
    } finally {
      setIsAdding(false)
      inputRef.current?.focus()
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return
    setDeletingId(id)

    const saved = steps.find((s) => s.id === id)
    setSteps((prev) => prev.filter((s) => s.id !== id))

    try {
      const res = await fetch(`/api/project-steps/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      if (saved) setSteps((prev) => [...prev, saved].sort((a, b) => a.order - b.order))
    } finally {
      setDeletingId(null)
    }
  }

  const handleReorder = async (id: string, direction: "up" | "down") => {
    if (reorderingId) return
    setReorderingId(id)

    const idx = steps.findIndex((s) => s.id === id)
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) {
      setReorderingId(null)
      return
    }

    const current = steps[idx]
    const swap = steps[swapIdx]
    const newSteps = steps.map((s) => {
      if (s.id === current.id) return { ...s, order: swap.order }
      if (s.id === swap.id) return { ...s, order: current.order }
      return s
    })
    setSteps(newSteps.sort((a, b) => a.order - b.order))

    try {
      await Promise.all([
        fetch(`/api/project-steps/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: swap.order }),
        }),
        fetch(`/api/project-steps/${swap.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: current.order }),
        }),
      ])
    } catch {
      setSteps(steps)
    } finally {
      setReorderingId(null)
    }
  }

  const completedSteps = steps.filter((s) => s.completed_at !== null)
  const pendingSteps = steps.filter((s) => s.completed_at === null)

  return (
    <div className="border-t border-border/40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/10">
        <div className="flex items-center gap-2.5">
          <ListChecks className="size-3.5 text-primary/70 shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Check-list chantier
          </span>
          {steps.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm border font-mono"
              style={{
                color: progress === 100 ? "oklch(0.72 0.18 155)" : "oklch(0.69 0.168 47)",
                borderColor: progress === 100 ? "oklch(0.72 0.18 155 / 0.3)" : "oklch(0.69 0.168 47 / 0.3)",
                background: progress === 100 ? "oklch(0.72 0.18 155 / 0.08)" : "oklch(0.69 0.168 47 / 0.08)",
              }}
            >
              {completedCount}/{steps.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
            style={{
              background: isLive ? "oklch(0.72 0.18 155)" : "oklch(0.45 0.008 258)",
              boxShadow: isLive ? "0 0 0 2px oklch(0.72 0.18 155 / 0.2)" : "none",
            }}
          />
          <span className="text-[10px] text-muted-foreground">
            {isLive ? <span className="flex items-center gap-1"><Activity className="size-2.5" />Temps réel</span> : "Connexion…"}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-3">
        {/* Progress bar */}
        {steps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">Progression</span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: progress === 100 ? "oklch(0.72 0.18 155)" : "oklch(0.69 0.168 47)" }}
              >
                {progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-secondary/60">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background:
                    progress === 100
                      ? "oklch(0.72 0.18 155)"
                      : "linear-gradient(90deg, oklch(0.60 0.14 47) 0%, oklch(0.72 0.18 47) 100%)",
                }}
              />
            </div>
          </div>
        )}

        {/* Steps list */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-4 text-muted-foreground animate-spin" />
          </div>
        ) : steps.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 italic py-2">
            Aucune étape — ajoutez des étapes ci-dessous
          </p>
        ) : (
          <div className="space-y-1">
            {steps.map((step, idx) => {
              const isDone = step.completed_at !== null
              const isJustCompleted = newlyCompleted.has(step.id)
              return (
                <div
                  key={step.id}
                  className="group flex items-start gap-2.5 rounded-sm px-2.5 py-2 transition-all"
                  style={{
                    background: isJustCompleted
                      ? "oklch(0.72 0.18 155 / 0.08)"
                      : isDone
                        ? "oklch(0.72 0.18 155 / 0.04)"
                        : "oklch(0.15 0.008 258 / 0.5)",
                    border: `1px solid ${
                      isJustCompleted
                        ? "oklch(0.72 0.18 155 / 0.3)"
                        : isDone
                          ? "oklch(0.72 0.18 155 / 0.15)"
                          : "oklch(0.25 0.008 258)"
                    }`,
                    animation: isJustCompleted ? "pulse-border 0.6s ease" : "none",
                  }}
                >
                  {/* Status icon */}
                  {isDone ? (
                    <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.18 155)" }} />
                  ) : (
                    <Circle className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
                  )}

                  {/* Label + completion info */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs font-medium block leading-5 ${isDone ? "line-through text-muted-foreground/50" : "text-foreground"}`}
                    >
                      <span className="text-muted-foreground/40 font-mono mr-1.5 text-[10px]">
                        {step.order}.
                      </span>
                      {step.label}
                    </span>
                    {isDone && step.completed_at && (
                      <span
                        className="text-[10px] text-muted-foreground/60 block"
                        title={formatDateTime(step.completed_at)}
                      >
                        {formatRelative(step.completed_at)}
                      </span>
                    )}
                  </div>

                  {/* Reorder + delete controls */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleReorder(step.id, "up")}
                      disabled={idx === 0 || reorderingId === step.id}
                      className="p-1 rounded-sm hover:bg-accent disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
                      title="Monter"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      onClick={() => handleReorder(step.id, "down")}
                      disabled={idx === steps.length - 1 || reorderingId === step.id}
                      className="p-1 rounded-sm hover:bg-accent disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
                      title="Descendre"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(step.id)}
                      disabled={deletingId === step.id}
                      className="p-1 rounded-sm hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors ml-0.5"
                      title="Supprimer"
                    >
                      {deletingId === step.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Completed steps history (collapsible) */}
        {completedSteps.length > 0 && (
          <CompletedHistory steps={completedSteps} />
        )}

        {/* Pending alert if all steps done */}
        {pendingSteps.length === 0 && steps.length > 0 && (
          <div
            className="flex items-center gap-2 rounded-sm px-3 py-2"
            style={{
              background: "oklch(0.72 0.18 155 / 0.06)",
              border: "1px solid oklch(0.72 0.18 155 / 0.2)",
            }}
          >
            <CheckCircle2 className="size-3.5 shrink-0" style={{ color: "oklch(0.72 0.18 155)" }} />
            <span className="text-xs font-medium" style={{ color: "oklch(0.72 0.18 155)" }}>
              Toutes les étapes sont complétées
            </span>
          </div>
        )}

        {/* Add step form */}
        <div className="flex gap-2 pt-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Nouvelle étape…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddStep()
            }}
            disabled={isAdding}
            className="flex-1 bg-input border border-border/60 rounded-sm px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
            style={{ height: "32px" }}
          />
          <button
            onClick={handleAddStep}
            disabled={!newLabel.trim() || isAdding}
            className="flex items-center gap-1.5 px-3 rounded-sm text-xs font-medium transition-all disabled:opacity-40 active:scale-95 shrink-0"
            style={{
              height: "32px",
              background: "oklch(0.69 0.168 47 / 0.15)",
              color: "oklch(0.69 0.168 47)",
              border: "1px solid oklch(0.69 0.168 47 / 0.3)",
            }}
          >
            {isAdding ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" />
            )}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function CompletedHistory({ steps }: { steps: ProjectStep[] }) {
  const [open, setOpen] = useState(false)
  const sorted = [...steps].sort((a, b) =>
    new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
  )

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors uppercase tracking-wider"
      >
        <span
          className="transition-transform duration-150 inline-block"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        Historique ({steps.length} étape{steps.length > 1 ? "s" : ""} complétée{steps.length > 1 ? "s" : ""})
      </button>

      {open && (
        <div className="mt-2 space-y-1 pl-3 border-l border-border/40">
          {sorted.map((step) => (
            <div key={step.id} className="flex items-start gap-2">
              <CheckCircle2 className="size-3 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.18 155 / 0.6)" }} />
              <div className="min-w-0">
                <span className="text-[10px] text-foreground/60 line-through block">{step.label}</span>
                {step.completed_at && (
                  <span className="text-[10px] text-muted-foreground/50">
                    {new Date(step.completed_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

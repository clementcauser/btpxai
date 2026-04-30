"use client"

import { useState, useEffect } from "react"
import { Check, ListChecks, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { ProjectStep } from "@/types"

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AvancementTab({ projectId }: { projectId: string }) {
  const [steps, setSteps] = useState<ProjectStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
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
      } catch {
        setError("Impossible de charger les étapes")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  useEffect(() => {
    const channel = supabase
      .channel(`project-steps-terrain-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_steps",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newStep = payload.new as ProjectStep
          setSteps((prev) =>
            [...prev, newStep].sort((a, b) => a.order - b.order)
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
          setSteps((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          )
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  const toggleStep = async (step: ProjectStep) => {
    if (toggling) return
    setToggling(step.id)

    const nowCompleted = step.completed_at === null
    const newCompletedAt = nowCompleted ? new Date().toISOString() : null

    // Optimistic update
    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, completed_at: newCompletedAt } : s
      )
    )

    try {
      const res = await fetch(`/api/project-steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed_at: newCompletedAt,
          completed_by: null,
        }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? (json.step as ProjectStep) : s))
      )
    } catch {
      // Rollback
      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id ? { ...s, completed_at: step.completed_at } : s
        )
      )
    } finally {
      setToggling(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "oklch(0.69 0.168 47)", borderTopColor: "transparent" }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div
          className="flex items-center gap-3 rounded-sm p-4"
          style={{ background: "oklch(0.22 0.04 25 / 0.4)", border: "1px solid oklch(0.62 0.22 25 / 0.4)" }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "oklch(0.72 0.22 25)" }} />
          <span className="text-sm" style={{ color: "oklch(0.85 0.12 25)" }}>{error}</span>
        </div>
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center py-16 text-center">
        <ListChecks className="w-10 h-10 opacity-20 mb-3" style={{ color: "oklch(0.69 0.168 47)" }} />
        <p
          className="text-sm font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-barlow)", color: "oklch(0.55 0.008 258)" }}
        >
          Aucune étape définie
        </p>
        <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.008 258)" }}>
          Le bureau n'a pas encore créé de check-list
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Progress card */}
      <div
        className="border rounded-sm p-4"
        style={{ background: "oklch(0.15 0.01 258)", borderColor: "oklch(0.29 0.012 258)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-barlow)", color: "oklch(0.55 0.008 258)" }}
          >
            Avancement global
          </span>
          <span
            className="text-3xl font-bold leading-none"
            style={{ fontFamily: "var(--font-barlow)", color: "oklch(0.69 0.168 47)" }}
          >
            {progress}%
          </span>
        </div>

        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "oklch(0.21 0.01 258)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "oklch(0.69 0.168 47)" }}
          />
        </div>

        <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.008 258)" }}>
          {completedCount} / {steps.length} étapes terminées
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isDone = step.completed_at !== null
          const isToggling = toggling === step.id
          return (
            <button
              key={step.id}
              onClick={() => toggleStep(step)}
              disabled={isToggling}
              data-testid={`step-${step.id}`}
              className="w-full flex items-start gap-4 rounded-sm border text-left active:scale-[0.97] transition-all disabled:opacity-60"
              style={{
                minHeight: "56px",
                padding: "12px 16px",
                background: isDone ? "oklch(0.22 0.04 47 / 0.3)" : "oklch(0.17 0.008 258)",
                borderColor: isDone ? "oklch(0.69 0.168 47 / 0.4)" : "oklch(0.29 0.012 258)",
              }}
            >
              <div
                className="w-6 h-6 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                style={{
                  background: isDone ? "oklch(0.69 0.168 47)" : "transparent",
                  borderColor: isDone ? "oklch(0.69 0.168 47)" : "oklch(0.45 0.008 258)",
                }}
              >
                {isToggling ? (
                  <div
                    className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
                    style={{ borderColor: isDone ? "oklch(0.11 0.008 258)" : "oklch(0.69 0.168 47)", borderTopColor: "transparent" }}
                  />
                ) : isDone ? (
                  <Check className="w-4 h-4" style={{ color: "oklch(0.11 0.008 258)" }} />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-bold uppercase tracking-wide block"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    color: isDone ? "oklch(0.69 0.168 47 / 0.7)" : "oklch(0.92 0.012 78)",
                    textDecoration: isDone ? "line-through" : "none",
                  }}
                >
                  {step.label}
                </span>
                {isDone && step.completed_at && (
                  <span
                    className="text-[10px] block mt-0.5"
                    style={{ color: "oklch(0.55 0.008 258)" }}
                  >
                    Terminé le {formatTimestamp(step.completed_at)}
                  </span>
                )}
              </div>

              <span
                className="text-[10px] font-bold uppercase tracking-wide shrink-0 mt-1"
                style={{
                  fontFamily: "var(--font-barlow)",
                  color: isDone ? "oklch(0.69 0.168 47)" : "oklch(0.45 0.008 258)",
                }}
              >
                {step.order}
              </span>
            </button>
          )
        })}
      </div>

      {progress === 100 && (
        <div
          className="flex items-center justify-center gap-3 rounded-sm p-4"
          style={{
            background: "oklch(0.22 0.04 47 / 0.3)",
            border: "1px solid oklch(0.69 0.168 47 / 0.5)",
            animation: "fadeSlideIn 0.3s ease both",
          }}
        >
          <ListChecks className="w-5 h-5" style={{ color: "oklch(0.69 0.168 47)" }} />
          <span
            className="font-bold uppercase tracking-wide text-sm"
            style={{ fontFamily: "var(--font-barlow)", color: "oklch(0.69 0.168 47)" }}
          >
            Chantier terminé !
          </span>
        </div>
      )}
    </div>
  )
}

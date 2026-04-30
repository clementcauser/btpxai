"use client"

import { useState } from "react"
import { Check, ListChecks } from "lucide-react"
import type { ProjectStep } from "@/types"

const DEMO_STEPS: ProjectStep[] = [
  {
    id: "1",
    project_id: "",
    label: "Préparation du chantier",
    order: 1,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    completed_by: null,
  },
  {
    id: "2",
    project_id: "",
    label: "Fondations & ancrage",
    order: 2,
    completed_at: null,
    completed_by: null,
  },
  {
    id: "3",
    project_id: "",
    label: "Structure métallique",
    order: 3,
    completed_at: null,
    completed_by: null,
  },
  {
    id: "4",
    project_id: "",
    label: "Soudures & assemblage",
    order: 4,
    completed_at: null,
    completed_by: null,
  },
  {
    id: "5",
    project_id: "",
    label: "Finitions & peinture",
    order: 5,
    completed_at: null,
    completed_by: null,
  },
]

export default function AvancementTab({ projectId: _projectId }: { projectId: string }) {
  const [steps, setSteps] = useState<ProjectStep[]>(DEMO_STEPS)

  const completedCount = steps.filter((s) => s.completed_at !== null).length
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              completed_at: s.completed_at ? null : new Date().toISOString(),
            }
          : s
      )
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-card border border-border rounded-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Avancement global
          </span>
          <span
            className="text-3xl font-bold leading-none"
            style={{
              fontFamily: "var(--font-barlow)",
              color: "oklch(0.69 0.168 47)",
            }}
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
            style={{
              width: `${progress}%`,
              background: "oklch(0.69 0.168 47)",
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {completedCount} / {steps.length} étapes terminées
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const isDone = step.completed_at !== null
          return (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              data-testid={`step-${step.id}`}
              className="w-full flex items-center gap-4 rounded-sm border text-left active:scale-[0.97] transition-all"
              style={{
                minHeight: "56px",
                padding: "12px 16px",
                background: isDone ? "oklch(0.22 0.04 47 / 0.3)" : "oklch(0.17 0.008 258)",
                borderColor: isDone
                  ? "oklch(0.69 0.168 47 / 0.4)"
                  : "oklch(0.29 0.012 258)",
              }}
            >
              <div
                className="w-6 h-6 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: isDone ? "oklch(0.69 0.168 47)" : "transparent",
                  borderColor: isDone
                    ? "oklch(0.69 0.168 47)"
                    : "oklch(0.45 0.008 258)",
                }}
              >
                {isDone && (
                  <Check
                    className="w-4 h-4"
                    style={{ color: "oklch(0.11 0.008 258)" }}
                  />
                )}
              </div>

              <span
                className="text-sm font-bold uppercase tracking-wide flex-1"
                style={{
                  fontFamily: "var(--font-barlow)",
                  color: isDone
                    ? "oklch(0.69 0.168 47 / 0.7)"
                    : "oklch(0.92 0.012 78)",
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {step.label}
              </span>

              <span
                className="text-[10px] font-bold uppercase tracking-wide shrink-0"
                style={{
                  fontFamily: "var(--font-barlow)",
                  color: isDone
                    ? "oklch(0.69 0.168 47)"
                    : "oklch(0.45 0.008 258)",
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
            style={{
              fontFamily: "var(--font-barlow)",
              color: "oklch(0.69 0.168 47)",
            }}
          >
            Chantier terminé !
          </span>
        </div>
      )}
    </div>
  )
}

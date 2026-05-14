"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/types"

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  todo: {
    label: "À faire",
    className: "bg-muted/60 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground",
  },
  in_progress: {
    label: "En cours",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  done: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  blocked: {
    label: "Bloqué",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminé" },
  { value: "blocked", label: "Bloqué" },
]

interface TaskStatusBadgeProps {
  taskId: string
  projectId: string
  initialStatus: TaskStatus
}

export function TaskStatusBadge({ taskId, projectId, initialStatus }: TaskStatusBadgeProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [isEditing, setIsEditing] = useState(false)
  const cfg = STATUS_CONFIG[status]

  async function handleChange(newStatus: TaskStatus) {
    const prev = status
    setStatus(newStatus)
    setIsEditing(false)
    try {
      const res = await fetch(`/api/projets/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      startTransition(() => router.refresh())
      toast.success("Statut mis à jour")
    } catch {
      setStatus(prev)
      toast.error("Erreur lors de la mise à jour du statut")
    }
  }

  if (isEditing) {
    return (
      <select
        autoFocus
        value={status}
        onChange={(e) => handleChange(e.target.value as TaskStatus)}
        onBlur={() => setIsEditing(false)}
        className="text-xs border rounded-full px-2 py-0.5 bg-card border-border text-foreground cursor-pointer focus:outline-none shrink-0"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-opacity hover:opacity-80",
        cfg.className
      )}
      title="Cliquer pour changer le statut"
    >
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
      <svg className="size-2 opacity-60" viewBox="0 0 10 6" fill="currentColor" aria-hidden>
        <path d="M0 0l5 6 5-6H0z" />
      </svg>
    </button>
  )
}

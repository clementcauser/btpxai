"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserPlus, X, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ProjectMember, WorkspaceMemberWithUser } from "@/types"

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  bureau: "Bureau",
  ouvrier: "Ouvrier",
}

type Props = {
  projectId: string
  members: ProjectMember[]
  workspaceMembers: WorkspaceMemberWithUser[]
}

export function ProjectMembersManager({
  projectId,
  members,
  workspaceMembers,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selectedUserId, setSelectedUserId] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const memberUserIds = new Set(members.map((m) => m.user_id))
  const availableToAdd = workspaceMembers.filter(
    (wm) => wm.user && !memberUserIds.has(wm.user_id)
  )

  async function handleAdd() {
    if (!selectedUserId) return
    setIsAdding(true)
    try {
      const res = await fetch(`/api/projets/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Erreur lors de l'ajout du membre")
        return
      }
      toast.success("Membre ajouté au projet")
      setSelectedUserId("")
      startTransition(() => router.refresh())
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(userId: string, userName: string) {
    try {
      const res = await fetch(`/api/projets/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Erreur lors de la suppression")
        return
      }
      toast.success(`${userName} retiré du projet`)
      startTransition(() => router.refresh())
    } catch {
      toast.error("Erreur réseau")
    }
  }

  return (
    <div className="space-y-4">
      {/* Current members */}
      {members.length === 0 ? (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0 opacity-40" />
          <span>Aucun membre assigné à ce projet</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const wm = workspaceMembers.find((w) => w.user_id === member.user_id)
            const user = member.user
            if (!user) return null
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border border-border bg-card text-sm group"
              >
                {/* Avatar */}
                <div className="size-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-primary font-medium text-[10px] leading-none">
                    {userInitials(user.name)}
                  </span>
                </div>
                <span className="text-foreground text-xs font-medium">
                  {user.name}
                </span>
                {wm && (
                  <span className="text-[10px] text-muted-foreground">
                    {ROLE_LABELS[wm.role] ?? wm.role}
                  </span>
                )}
                <button
                  onClick={() => handleRemove(member.user_id, user.name)}
                  className="ml-0.5 text-muted-foreground/50 hover:text-red-400 transition-colors"
                  title={`Retirer ${user.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add member */}
      {availableToAdd.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={cn(
                "w-full h-8 rounded-sm border border-border bg-card text-sm text-foreground px-3 pr-8",
                "appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40",
                !selectedUserId && "text-muted-foreground"
              )}
            >
              <option value="">Ajouter un membre…</option>
              {availableToAdd.map((wm) => (
                <option key={wm.user_id} value={wm.user_id}>
                  {wm.user?.name} ({ROLE_LABELS[wm.role] ?? wm.role})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6z" />
              </svg>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedUserId || isAdding}
            className="h-8 gap-1.5"
          >
            <UserPlus className="size-3.5" />
            Ajouter
          </Button>
        </div>
      )}
    </div>
  )
}

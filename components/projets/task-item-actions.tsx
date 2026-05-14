"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Member {
  id: string
  name: string
}

interface TaskItemActionsProps {
  taskId: string
  projectId: string
  initialTitle: string
  initialAssignedTo: string | null
  initialDueDate: string | null
  members: Member[]
}

export function TaskItemActions({
  taskId,
  projectId,
  initialTitle,
  initialAssignedTo,
  initialDueDate,
  members,
}: TaskItemActionsProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [title, setTitle] = useState(initialTitle)
  const [assignedTo, setAssignedTo] = useState<string>(initialAssignedTo ?? "none")
  const [dueDate, setDueDate] = useState(initialDueDate?.slice(0, 10) ?? "")

  function onOpenEdit() {
    setTitle(initialTitle)
    setAssignedTo(initialAssignedTo ?? "none")
    setDueDate(initialDueDate?.slice(0, 10) ?? "")
    setEditOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projets/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assigned_to: assignedTo === "none" ? null : assignedTo,
          due_date: dueDate || null,
        }),
      })
      if (!res.ok) throw new Error()
      setEditOpen(false)
      startTransition(() => router.refresh())
      toast.success("Tâche mise à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projets/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      setDeleteOpen(false)
      startTransition(() => router.refresh())
      toast.success("Tâche supprimée")
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={onOpenEdit}
          title="Modifier la tâche"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          title="Supprimer la tâche"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Intitulé
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Intitulé de la tâche"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Responsable
              </label>
              <Select
                value={assignedTo}
                onValueChange={(v) => setAssignedTo(v ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun responsable">
                    {assignedTo !== "none"
                      ? (members.find((m) => m.id === assignedTo)?.name ?? null)
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun responsable</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date d&apos;échéance
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la tâche ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. La tâche &laquo;&nbsp;{initialTitle}&nbsp;&raquo; sera définitivement supprimée.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

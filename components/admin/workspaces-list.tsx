"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Building2, AlertTriangle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

type Workspace = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

const workspaceSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  slug: z
    .string()
    .min(1, "Slug requis")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
})

type WorkspaceForm = z.infer<typeof workspaceSchema>

function WorkspaceFormFields({ form }: { form: ReturnType<typeof useForm<WorkspaceForm>> }) {
  const { register, formState: { errors } } = form
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Nom</Label>
        <Input
          {...register("name")}
          placeholder="Dupont Métallerie"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7]"
          data-testid="workspace-name-input"
        />
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Slug</Label>
        <Input
          {...register("slug")}
          placeholder="dupont-metallerie"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7] font-mono"
          data-testid="workspace-slug-input"
        />
        {errors.slug && (
          <p className="text-xs text-red-400">{errors.slug.message}</p>
        )}
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Lettres minuscules, chiffres et tirets uniquement.
        </p>
      </div>
    </>
  )
}

export function WorkspacesList({ initialWorkspaces }: { initialWorkspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Workspace | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const createForm = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", slug: "" },
  })

  const editForm = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
  })

  function openEdit(ws: Workspace) {
    setEditTarget(ws)
    editForm.reset({ name: ws.name, slug: ws.slug })
  }

  async function handleCreate(data: WorkspaceForm) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json() as { workspace?: Workspace; error?: Record<string, string[]> }
      if (!res.ok) throw new Error(Object.values(json.error ?? {}).flat().join(", ") || "Erreur")
      setWorkspaces((prev: Workspace[]) => [json.workspace!, ...prev])
      setCreateOpen(false)
      createForm.reset()
      toast.success("Entreprise créée")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(data: WorkspaceForm) {
    if (!editTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json() as { workspace?: Workspace; error?: Record<string, string[]> }
      if (!res.ok) throw new Error(Object.values(json.error ?? {}).flat().join(", ") || "Erreur")
      setWorkspaces((prev: Workspace[]) =>
        prev.map((ws: Workspace) => (ws.id === editTarget.id ? json.workspace! : ws))
      )
      setEditTarget(null)
      toast.success("Entreprise modifiée")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error || "Erreur")
      }
      setWorkspaces((prev: Workspace[]) => prev.filter((ws: Workspace) => ws.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success("Entreprise supprimée")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #1A1E2A", background: "#0F1219" }}
      >
        {/* Table header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1A1E2A" }}
        >
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
            {workspaces.length} résultat{workspaces.length !== 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-2 font-mono text-xs tracking-wide"
            style={{
              background: "#4F8EF7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
            }}
            data-testid="create-workspace-btn"
          >
            <Plus className="size-3.5" />
            Nouvelle entreprise
          </Button>
        </div>

        {/* Column labels */}
        <div
          className="grid grid-cols-[1fr_160px_160px_96px] px-5 py-2.5"
          style={{ borderBottom: "1px solid #1A1E2A" }}
        >
          {["Nom", "Slug", "Créé le", "Actions"].map((h) => (
            <span
              key={h}
              className="text-[10px] font-mono tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 className="size-8" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Aucune entreprise enregistrée
            </p>
          </div>
        ) : (
          workspaces.map((ws: Workspace, i: number) => (
            <div
              key={ws.id}
              className="grid grid-cols-[1fr_160px_160px_96px] items-center px-5 py-4 transition-colors"
              style={{
                borderBottom: i < workspaces.length - 1 ? "1px solid #1A1E2A" : undefined,
              }}
              data-testid="workspace-row"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{ws.name}</p>
                <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {ws.id}
                </p>
              </div>
              <span
                className="text-xs font-mono px-2 py-1 rounded w-fit"
                style={{ background: "rgba(79,142,247,0.1)", color: "#4F8EF7", border: "1px solid rgba(79,142,247,0.2)" }}
              >
                {ws.slug}
              </span>
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                {new Date(ws.created_at).toLocaleDateString("fr-FR")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(ws)}
                  className="p-1.5 rounded transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  title="Modifier"
                  data-testid="edit-workspace-btn"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(ws)}
                  className="p-1.5 rounded transition-colors hover:text-red-400"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  title="Supprimer"
                  data-testid="delete-workspace-btn"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" style={{ background: "#0F1219", border: "1px solid #1A1E2A" }}>
          <DialogHeader>
            <DialogTitle className="text-white font-heading tracking-wide uppercase">
              Nouvelle entreprise
            </DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
              Créer un nouveau workspace pour une entreprise cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 mt-2">
            <WorkspaceFormFields form={createForm} />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="text-white/50 hover:text-white hover:bg-white/5"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                style={{ background: "#4F8EF7", color: "#fff", border: "none" }}
                data-testid="create-workspace-submit"
              >
                {saving ? "Création…" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(o: boolean) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md" style={{ background: "#0F1219", border: "1px solid #1A1E2A" }}>
          <DialogHeader>
            <DialogTitle className="text-white font-heading tracking-wide uppercase">
              Modifier l&apos;entreprise
            </DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
              {editTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 mt-2">
            <WorkspaceFormFields form={editForm} />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditTarget(null)}
                className="text-white/50 hover:text-white hover:bg-white/5"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                style={{ background: "#4F8EF7", color: "#fff", border: "none" }}
                data-testid="edit-workspace-submit"
              >
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm" style={{ background: "#0F1219", border: "1px solid #1A1E2A" }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="size-9 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                <AlertTriangle className="size-4 text-red-400" />
              </div>
              <DialogTitle className="text-white font-heading tracking-wide uppercase">
                Supprimer l&apos;entreprise
              </DialogTitle>
            </div>
            <DialogDescription style={{ color: "rgba(255,255,255,0.5)" }}>
              Êtes-vous sûr de vouloir supprimer{" "}
              <span className="text-white font-medium">{deleteTarget?.name}</span> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-white/50 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: "#EF4444", color: "#fff", border: "none" }}
              data-testid="delete-workspace-confirm"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

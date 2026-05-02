"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Users, AlertTriangle } from "lucide-react"
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

type AdminUser = {
  id: string
  email: string
  name: string | null
  role: "admin" | "bureau" | "ouvrier" | null
  created_at: string
}

type RoleKey = "admin" | "bureau" | "ouvrier"

const ROLE_STYLES: Record<RoleKey, { bg: string; text: string; border: string; label: string }> = {
  admin: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B", border: "rgba(245,158,11,0.25)", label: "Admin" },
  bureau: { bg: "rgba(79,142,247,0.1)", text: "#4F8EF7", border: "rgba(79,142,247,0.25)", label: "Bureau" },
  ouvrier: { bg: "rgba(34,197,94,0.1)", text: "#22C55E", border: "rgba(34,197,94,0.25)", label: "Ouvrier" },
}

const createSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis").max(100),
  role: z.enum(["admin", "bureau", "ouvrier"] as const),
  password: z.string().min(8, "8 caractères minimum").optional().or(z.literal("")),
})

const editSchema = z.object({
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  name: z.string().min(1, "Nom requis").max(100).optional().or(z.literal("")),
  role: z.enum(["admin", "bureau", "ouvrier"] as const),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-xs text-white/20 font-mono">—</span>
  const s = ROLE_STYLES[role as RoleKey] ?? ROLE_STYLES.bureau
  return (
    <span
      className="text-[11px] font-mono px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

function RoleSelector({
  value,
  onChange,
}: {
  value: RoleKey
  onChange: (r: RoleKey) => void
}) {
  const roles: RoleKey[] = ["bureau", "ouvrier", "admin"]
  return (
    <div className="flex gap-2">
      {roles.map((r) => {
        const s = ROLE_STYLES[r]
        const active = value === r
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className="flex-1 py-2 rounded text-xs font-mono tracking-wide transition-all"
            style={
              active
                ? { background: s.bg, color: s.text, border: `1px solid ${s.border}` }
                : { background: "transparent", color: "rgba(255,255,255,0.3)", border: "1px solid #1A1E2A" }
            }
            data-testid={`role-btn-${r}`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

function CreateUserFields({ form }: { form: ReturnType<typeof useForm<CreateForm>> }) {
  const { register, watch, setValue, formState: { errors } } = form
  const currentRole = watch("role")
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Nom</Label>
        <Input
          {...register("name")}
          placeholder="Marie Dupont"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7]"
          data-testid="user-name-input"
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Email</Label>
        <Input
          {...register("email")}
          type="email"
          placeholder="marie@exemple.com"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7]"
          data-testid="user-email-input"
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">
          Mot de passe <span className="text-white/30">(optionnel)</span>
        </Label>
        <Input
          {...register("password")}
          type="password"
          placeholder="Laissez vide pour générer automatiquement"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7]"
          data-testid="user-password-input"
        />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Rôle</Label>
        <RoleSelector
          value={currentRole as RoleKey}
          onChange={(r) => setValue("role", r)}
        />
      </div>
    </>
  )
}

function EditUserFields({ form }: { form: ReturnType<typeof useForm<EditForm>> }) {
  const { register, watch, setValue, formState: { errors } } = form
  const currentRole = watch("role")
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Nom</Label>
        <Input
          {...register("name")}
          placeholder="Marie Dupont"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7]"
          data-testid="user-name-input"
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Email</Label>
        <Input
          {...register("email")}
          type="email"
          placeholder="marie@exemple.com"
          className="bg-[#080A0F] border-[#1A1E2A] text-white placeholder:text-white/20 focus-visible:ring-[#4F8EF7]"
          data-testid="user-email-input"
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs font-mono tracking-wider uppercase">Rôle</Label>
        <RoleSelector
          value={currentRole as RoleKey}
          onChange={(r) => setValue("role", r)}
        />
      </div>
    </>
  )
}

export function UsersList({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", name: "", role: "bureau", password: "" },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  function openEdit(u: AdminUser) {
    setEditTarget(u)
    editForm.reset({ email: u.email, name: u.name ?? "", role: u.role ?? "bureau" })
  }

  async function handleCreate(data: CreateForm) {
    setSaving(true)
    try {
      const payload = { ...data, password: data.password || undefined }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { user?: AdminUser; error?: Record<string, string[]> }
      if (!res.ok) throw new Error(Object.values(json.error ?? {}).flat().join(", ") || "Erreur")
      setUsers((prev: AdminUser[]) => [json.user!, ...prev])
      setCreateOpen(false)
      createForm.reset()
      toast.success("Utilisateur créé")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(data: EditForm) {
    if (!editTarget) return
    setSaving(true)
    try {
      const payload: Record<string, string> = { role: data.role }
      if (data.email) payload.email = data.email
      if (data.name) payload.name = data.name
      const res = await fetch(`/api/admin/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { user?: AdminUser; error?: Record<string, string[]> }
      if (!res.ok) throw new Error(Object.values(json.error ?? {}).flat().join(", ") || "Erreur")
      setUsers((prev: AdminUser[]) =>
        prev.map((u: AdminUser) => (u.id === editTarget.id ? json.user! : u))
      )
      setEditTarget(null)
      toast.success("Utilisateur modifié")
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
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error || "Erreur")
      setUsers((prev: AdminUser[]) => prev.filter((u: AdminUser) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success("Utilisateur supprimé")
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
            {users.length} résultat{users.length !== 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-2 font-mono text-xs tracking-wide"
            style={{ background: "#4F8EF7", color: "#fff", border: "none", borderRadius: "6px" }}
            data-testid="create-user-btn"
          >
            <Plus className="size-3.5" />
            Nouvel utilisateur
          </Button>
        </div>

        {/* Column labels */}
        <div
          className="grid grid-cols-[1fr_140px_120px_96px] px-5 py-2.5"
          style={{ borderBottom: "1px solid #1A1E2A" }}
        >
          {["Utilisateur", "Rôle", "Créé le", "Actions"].map((h) => (
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
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="size-8" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Aucun utilisateur enregistré
            </p>
          </div>
        ) : (
          users.map((u: AdminUser, i: number) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_140px_120px_96px] items-center px-5 py-4 transition-colors"
              style={{ borderBottom: i < users.length - 1 ? "1px solid #1A1E2A" : undefined }}
              data-testid="user-row"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div
                  className="size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold"
                  style={{ background: "#1A2A4A", color: "#4F8EF7", border: "1px solid #2A3D5A" }}
                >
                  {u.email[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {u.name ?? u.email}
                  </p>
                  <p className="text-[11px] font-mono truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {u.email}
                  </p>
                </div>
              </div>
              <RoleBadge role={u.role} />
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                {new Date(u.created_at).toLocaleDateString("fr-FR")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(u)}
                  className="p-1.5 rounded transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  title="Modifier"
                  data-testid="edit-user-btn"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(u)}
                  className="p-1.5 rounded transition-colors hover:text-red-400"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  title="Supprimer"
                  data-testid="delete-user-btn"
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
              Nouvel utilisateur
            </DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
              Créer un compte utilisateur sur la plateforme.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 mt-2">
            <CreateUserFields form={createForm} />
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
                data-testid="create-user-submit"
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
              Modifier l&apos;utilisateur
            </DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
              {editTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 mt-2">
            <EditUserFields form={editForm} />
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
                data-testid="edit-user-submit"
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
                Supprimer l&apos;utilisateur
              </DialogTitle>
            </div>
            <DialogDescription style={{ color: "rgba(255,255,255,0.5)" }}>
              Êtes-vous sûr de vouloir supprimer{" "}
              <span className="text-white font-medium">{deleteTarget?.email}</span> ?
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
              data-testid="delete-user-confirm"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

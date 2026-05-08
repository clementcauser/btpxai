"use client"

import { useState, useMemo } from "react"
import { Search, X, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Users, Building2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserFormModal, type UserRow } from "./user-form-modal"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { useRouter } from "next/navigation"

const PER_PAGE = 20

const roleBadgeClass: Record<string, string> = {
  admin: "text-primary border-primary/40",
  bureau: "text-sky-400 border-sky-400/40",
  ouvrier: "text-emerald-400 border-emerald-400/40",
  super_admin: "text-violet-400 border-violet-400/40",
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  bureau: "Bureau",
  ouvrier: "Ouvrier",
  super_admin: "Super Admin",
}

type Props = { users: UserRow[] }

export function UsersTable({ users }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)

  const workspaces = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) {
      if (u.workspace_id && u.workspace_name) {
        map.set(u.workspace_id, u.workspace_name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchSearch = !q || u.email.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
      const matchWorkspace =
        workspaceFilter === "all" ||
        (workspaceFilter === "__none__" && !u.workspace_id) ||
        u.workspace_id === workspaceFilter
      return matchSearch && matchWorkspace
    })
  }, [users, search, workspaceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  async function handleDelete(id: string) {
    const res = await fetch(`/api/superadmin/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? "Erreur serveur")
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par email, nom ou rôle…"
            className="pl-9 pr-9 bg-secondary border-border h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40 pointer-events-none" />
          <select
            value={workspaceFilter}
            onChange={(e) => { setWorkspaceFilter(e.target.value); setPage(1) }}
            className={cn(
              "h-9 pl-9 pr-7 rounded-sm border text-sm bg-secondary text-foreground border-border appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50",
              workspaceFilter !== "all" && "border-primary/50 text-primary"
            )}
          >
            <option value="all">Tous les workspaces</option>
            <option value="__none__">Sans workspace</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {workspaceFilter !== "all" && (
          <button
            onClick={() => { setWorkspaceFilter("all"); setPage(1) }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" /> Réinitialiser
          </button>
        )}

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider uppercase h-9 ml-auto"
          data-testid="create-user-btn"
        >
          <Plus className="size-4" /> Nouveau
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
        {search && ` · filtrés sur "${search}"`}
        {workspaceFilter !== "all" && workspaceFilter !== "__none__" && ` · workspace : ${workspaces.find(w => w.id === workspaceFilter)?.name}`}
        {workspaceFilter === "__none__" && " · sans workspace"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground border border-dashed border-border rounded-sm">
          <Users className="size-8 opacity-30" />
          <p className="text-sm">{search ? "Aucun résultat" : "Aucun utilisateur"}</p>
        </div>
      ) : (
        <div className="rounded-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden md:table-cell">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden lg:table-cell">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden xl:table-cell">Workspace</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden 2xl:table-cell">Créé le</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((user, idx) => (
                <tr
                  key={user.id}
                  className={cn(
                    "group border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30",
                    idx % 2 === 0 ? "bg-transparent" : "bg-secondary/10"
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{user.email}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{user.name ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {user.role ? (
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", roleBadgeClass[user.role] ?? "")}>
                        {roleLabel[user.role] ?? user.role}
                      </Badge>
                    ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {user.workspace_name ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user.workspace_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden 2xl:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditUser(user)}
                        className="p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        className="p-1.5 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        data-testid={`delete-user-${user.id}`}
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {safePage} sur {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <UserFormModal open={createOpen} onOpenChange={setCreateOpen} />
      {editUser && (
        <UserFormModal
          open={!!editUser}
          onOpenChange={(open) => { if (!open) setEditUser(null) }}
          user={editUser}
        />
      )}
      {deleteUser && (
        <DeleteConfirmDialog
          open={!!deleteUser}
          onOpenChange={(open) => { if (!open) setDeleteUser(null) }}
          title="Supprimer l'utilisateur"
          description={`Supprimer "${deleteUser.email}" ? Cette action est irréversible.`}
          onConfirm={() => handleDelete(deleteUser.id)}
          successMessage="Utilisateur supprimé"
        />
      )}
    </div>
  )
}

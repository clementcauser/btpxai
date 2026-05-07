"use client"

import { useState, useMemo } from "react"
import { Search, X, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorkspaceFormModal, type WorkspaceRow } from "./workspace-form-modal"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { useRouter } from "next/navigation"

const PER_PAGE = 20

type Props = { workspaces: WorkspaceRow[] }

export function WorkspacesTable({ workspaces }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editWorkspace, setEditWorkspace] = useState<WorkspaceRow | null>(null)
  const [deleteWorkspace, setDeleteWorkspace] = useState<WorkspaceRow | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workspaces
    return workspaces.filter((w) => w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q))
  }, [workspaces, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  async function handleDelete(id: string) {
    const res = await fetch(`/api/superadmin/workspaces/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? "Erreur serveur")
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom ou slug…"
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
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider uppercase h-9"
          data-testid="create-workspace-btn"
        >
          <Plus className="size-4" /> Nouveau
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} espace{filtered.length !== 1 ? "s" : ""}
        {search && ` · filtrés sur "${search}"`}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground border border-dashed border-border rounded-sm">
          <Building2 className="size-8 opacity-30" />
          <p className="text-sm">{search ? "Aucun résultat" : "Aucun espace de travail"}</p>
          {!search && (
            <Button onClick={() => setCreateOpen(true)} variant="ghost" className="border border-border">
              <Plus className="size-4" /> Créer
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden md:table-cell">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden lg:table-cell">Créé le</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((workspace, idx) => (
                <tr
                  key={workspace.id}
                  className={cn(
                    "group border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30",
                    idx % 2 === 0 ? "bg-transparent" : "bg-secondary/10"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Building2 className="size-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{workspace.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">{workspace.slug}</code>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(workspace.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditWorkspace(workspace)}
                        className="p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteWorkspace(workspace)}
                        className="p-1.5 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        data-testid={`delete-workspace-${workspace.id}`}
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

      <WorkspaceFormModal open={createOpen} onOpenChange={setCreateOpen} />
      {editWorkspace && (
        <WorkspaceFormModal
          open={!!editWorkspace}
          onOpenChange={(open) => { if (!open) setEditWorkspace(null) }}
          workspace={editWorkspace}
        />
      )}
      {deleteWorkspace && (
        <DeleteConfirmDialog
          open={!!deleteWorkspace}
          onOpenChange={(open) => { if (!open) setDeleteWorkspace(null) }}
          title="Supprimer l'espace"
          description={`Supprimer "${deleteWorkspace.name}" ? Cette action est irréversible et supprimera tous les membres et données associés.`}
          onConfirm={() => handleDelete(deleteWorkspace.id)}
          successMessage="Espace de travail supprimé"
        />
      )}
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClientFormModal } from "@/components/clients/client-form-modal"
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import type { Client } from "@/types"

const PER_PAGE = 20

function clientInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

type Props = { clients: Client[] }

export function ClientsTable({ clients }: Props) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="pl-9 pr-9 bg-secondary border-border focus-visible:ring-primary/50 focus-visible:border-primary/60 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider uppercase h-9"
        >
          <Plus className="size-4" />
          Nouveau client
        </Button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} client{filtered.length !== 1 ? "s" : ""}
        {search && ` · filtrés sur "${search}"`}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground border border-dashed border-border rounded-sm">
          <Users className="size-8 opacity-30" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {search ? "Aucun résultat" : "Aucun client"}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {search
                ? "Essayez un autre terme de recherche"
                : "Créez votre premier client pour commencer"}
            </p>
          </div>
          {!search && (
            <Button
              onClick={() => setCreateOpen(true)}
              variant="ghost"
              className="border border-border hover:bg-accent text-sm"
            >
              <Plus className="size-4" />
              Créer un client
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden md:table-cell">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden lg:table-cell">
                  Téléphone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden xl:table-cell">
                  Adresse
                </th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((client, idx) => (
                <tr
                  key={client.id}
                  className={cn(
                    "group border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30",
                    idx % 2 === 0 ? "bg-transparent" : "bg-secondary/10"
                  )}
                  style={{ animationDelay: `${idx * 30}ms`, animation: "fadeSlideIn 0.3s ease both" }}
                >
                  {/* Name + initials */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="flex items-center gap-3 group/link"
                    >
                      <div className="size-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 transition-colors group-hover/link:border-primary/40 group-hover/link:bg-primary/15">
                        <span className="text-primary font-heading font-700 text-xs leading-none">
                          {clientInitials(client.name)}
                        </span>
                      </div>
                      <span className="font-medium text-foreground group-hover/link:text-primary transition-colors truncate max-w-[160px]">
                        {client.name}
                      </span>
                    </Link>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {client.email ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Mail className="size-3 shrink-0 opacity-50" />
                        <span className="truncate max-w-[180px]">{client.email}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {client.phone ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Phone className="size-3 shrink-0 opacity-50" />
                        {client.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </td>

                  {/* Address */}
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {client.address ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <MapPin className="size-3 shrink-0 opacity-50" />
                        <span className="truncate max-w-[200px]">{client.address}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/clients/${client.id}`}
                        className="p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Voir la fiche"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                      <button
                        onClick={() => setEditClient(client)}
                        className="p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteClient(client)}
                        className="p-1.5 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {safePage} sur {totalPages} · {filtered.length} clients
          </span>
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

      {/* Modals */}
      <ClientFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        client={null}
      />
      {editClient && (
        <ClientFormModal
          open={!!editClient}
          onOpenChange={(open) => { if (!open) setEditClient(null) }}
          client={editClient}
        />
      )}
      {deleteClient && (
        <DeleteClientDialog
          open={!!deleteClient}
          onOpenChange={(open) => { if (!open) setDeleteClient(null) }}
          client={deleteClient}
        />
      )}
    </>
  )
}

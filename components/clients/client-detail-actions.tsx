"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClientFormModal } from "@/components/clients/client-form-modal"
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import type { Client } from "@/types"

type Props = { client: Client }

export function ClientDetailActions({ client }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 border border-border hover:bg-accent h-8"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Modifier
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Supprimer
        </Button>
      </div>

      <ClientFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />
      <DeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        client={client}
        onSuccess={() => router.push("/clients")}
      />
    </>
  )
}

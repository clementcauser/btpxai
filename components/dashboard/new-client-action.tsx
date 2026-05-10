"use client"

import { useState } from "react"
import { Users } from "lucide-react"
import { ClientFormModal } from "@/components/clients/client-form-modal"

export function DashboardNewClientAction() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-start gap-3 rounded-sm border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/5 text-left w-full"
      >
        <div className="size-8 rounded-sm bg-muted flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/15">
          <Users className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            Nouveau client
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajouter un contact au répertoire
          </p>
        </div>
      </button>

      <ClientFormModal open={open} onOpenChange={setOpen} client={null} />
    </>
  )
}

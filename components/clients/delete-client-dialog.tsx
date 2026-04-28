"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Client } from "@/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client
  onSuccess?: () => void
}

export function DeleteClientDialog({ open, onOpenChange, client, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? "Erreur serveur")
        }
        toast.success("Client supprimé")
        onOpenChange(false)
        onSuccess?.()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-destructive/60 via-destructive to-destructive/60" />

        <div className="px-6 pt-5 pb-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-sm bg-destructive/10 border border-destructive/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4 text-destructive" />
              </div>
              <DialogTitle className="font-heading text-xl font-700 tracking-wide uppercase text-foreground">
                Supprimer le client
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Voulez-vous supprimer{" "}
              <span className="text-foreground font-medium">{client.name}</span>
              {" "}? Cette action est irréversible et supprimera également tous les projets et devis associés.
            </p>
          </DialogHeader>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 border border-border hover:bg-accent"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="flex-1 bg-destructive text-white hover:bg-destructive/90 font-heading tracking-wider uppercase"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const schema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  slug: z.string().min(2, "Slug requis").regex(/^[a-z0-9-]+$/, "Slug invalide (minuscules, chiffres, tirets)"),
})

type FormValues = z.infer<typeof schema>

export type WorkspaceRow = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace?: WorkspaceRow | null
}

export function WorkspaceFormModal({ open, onOpenChange, workspace }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!workspace

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: workspace?.name ?? "", slug: workspace?.slug ?? "" },
  })

  useEffect(() => {
    if (open) reset({ name: workspace?.name ?? "", slug: workspace?.slug ?? "" })
  }, [open, workspace, reset])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const url = isEditing
          ? `/api/superadmin/workspaces/${workspace.id}`
          : "/api/superadmin/workspaces"
        const method = isEditing ? "PUT" : "POST"

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? "Erreur serveur")
        }

        toast.success(isEditing ? "Espace de travail mis à jour" : "Espace de travail créé")
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden" data-testid="workspace-form-modal">
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <div className="px-6 pt-5 pb-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tracking-wider uppercase">
                {isEditing ? "Modifier" : "Nouveau"}
              </span>
            </div>
            <DialogTitle className="font-heading text-2xl font-bold tracking-wide uppercase text-foreground">
              {isEditing ? "Éditer l'espace" : "Créer un espace"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs tracking-wider uppercase text-muted-foreground">
                Nom <span className="text-primary">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Forge Dupont"
                className={cn("bg-secondary border-border", errors.name && "border-destructive")}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs tracking-wider uppercase text-muted-foreground">
                Slug <span className="text-primary">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="forge-dupont"
                className={cn("bg-secondary border-border font-mono text-sm", errors.slug && "border-destructive")}
                {...register("slug")}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
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
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider uppercase"
                disabled={isPending}
                data-testid="workspace-form-submit"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

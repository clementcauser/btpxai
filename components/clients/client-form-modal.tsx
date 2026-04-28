"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, User, Mail, Phone, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Client } from "@/types"

const schema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSuccess?: (client: Client) => void
}

export function ClientFormModal({ open, onOpenChange, client, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!client

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: client?.name ?? "",
        email: client?.email ?? "",
        phone: client?.phone ?? "",
        address: client?.address ?? "",
      })
    }
  }, [open, client, reset])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const body = {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          address: values.address || null,
        }

        const url = isEditing ? `/api/clients/${client.id}` : "/api/clients"
        const method = isEditing ? "PUT" : "POST"

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? "Erreur serveur")
        }

        const json = await res.json()
        toast.success(isEditing ? "Client mis à jour" : "Client créé")
        onOpenChange(false)
        onSuccess?.(json.client)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
        {/* Forge-branded header strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

        <div className="px-6 pt-5 pb-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground tracking-wider uppercase">
                    {isEditing ? "Modifier" : "Nouveau"}
                  </span>
                </div>
                <DialogTitle className="font-heading text-2xl font-700 tracking-wide uppercase text-foreground">
                  {isEditing ? "Éditer le client" : "Créer un client"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs tracking-wider uppercase text-muted-foreground">
                Nom <span className="text-primary">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input
                  id="name"
                  placeholder="Ex: Dupont Construction"
                  className={cn(
                    "pl-9 bg-secondary border-border focus-visible:ring-primary/50 focus-visible:border-primary/60",
                    errors.name && "border-destructive focus-visible:ring-destructive/50"
                  )}
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs tracking-wider uppercase text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@exemple.fr"
                  className={cn(
                    "pl-9 bg-secondary border-border focus-visible:ring-primary/50 focus-visible:border-primary/60",
                    errors.email && "border-destructive focus-visible:ring-destructive/50"
                  )}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs tracking-wider uppercase text-muted-foreground">
                Téléphone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input
                  id="phone"
                  placeholder="06 12 34 56 78"
                  className="pl-9 bg-secondary border-border focus-visible:ring-primary/50 focus-visible:border-primary/60"
                  {...register("phone")}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs tracking-wider uppercase text-muted-foreground">
                Adresse
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input
                  id="address"
                  placeholder="12 rue de la Forge, 75001 Paris"
                  className="pl-9 bg-secondary border-border focus-visible:ring-primary/50 focus-visible:border-primary/60"
                  {...register("address")}
                />
              </div>
            </div>

            {/* Actions */}
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
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isEditing ? (
                  "Enregistrer"
                ) : (
                  "Créer"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

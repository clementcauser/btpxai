"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Mail, User, ShieldCheck, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "bureau", label: "Bureau" },
  { value: "ouvrier", label: "Ouvrier" },
  { value: "super_admin", label: "Super Admin" },
] as const

const createSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  role: z.enum(["admin", "bureau", "ouvrier", "super_admin"]),
  password: z.string().min(8, "Mot de passe requis (8 caractères minimum)"),
})

const updateSchema = z.object({
  email: z.string().email("Email invalide").optional(),
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "bureau", "ouvrier", "super_admin"]).optional(),
  password: z.string().min(8).or(z.literal("")).optional(),
})

export type UserRow = {
  id: string
  email: string
  name: string | null
  role: string | null
  created_at: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserRow | null
}

export function UserFormModal({ open, onOpenChange, user }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!user

  type CreateValues = z.infer<typeof createSchema>
  type UpdateValues = z.infer<typeof updateSchema>
  type FormValues = CreateValues | UpdateValues

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: {
      email: user?.email ?? "",
      name: user?.name ?? "",
      role: (user?.role as "admin" | "bureau" | "ouvrier" | "super_admin" | undefined) ?? "bureau",
      password: "",
    },
  })

  useEffect(() => {
    if (open) reset({
      email: user?.email ?? "",
      name: user?.name ?? "",
      role: (user?.role as "admin" | "bureau" | "ouvrier" | "super_admin" | undefined) ?? "bureau",
      password: "",
    })
  }, [open, user, reset])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const body = isEditing
          ? Object.fromEntries(
              Object.entries(values).filter(([k, v]) => v !== "" && v !== undefined && (k !== "password" || v))
            )
          : values

        const url = isEditing ? `/api/superadmin/users/${user!.id}` : "/api/superadmin/users"
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

        toast.success(isEditing ? "Utilisateur mis à jour" : "Utilisateur créé")
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden" data-testid="user-form-modal">
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <div className="px-6 pt-5 pb-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <User className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tracking-wider uppercase">
                {isEditing ? "Modifier" : "Nouveau"}
              </span>
            </div>
            <DialogTitle className="font-heading text-2xl font-bold tracking-wide uppercase text-foreground">
              {isEditing ? "Éditer l'utilisateur" : "Créer un utilisateur"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs tracking-wider uppercase text-muted-foreground">
                Email {!isEditing && <span className="text-primary">*</span>}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input id="email" type="email" placeholder="utilisateur@exemple.fr"
                  className={cn("pl-9 bg-secondary border-border", errors.email && "border-destructive")}
                  {...register("email")} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs tracking-wider uppercase text-muted-foreground">
                Nom {!isEditing && <span className="text-primary">*</span>}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input id="name" placeholder="Jean Dupont"
                  className={cn("pl-9 bg-secondary border-border", errors.name && "border-destructive")}
                  {...register("name")} />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs tracking-wider uppercase text-muted-foreground">
                Rôle <span className="text-primary">*</span>
              </Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
                <select id="role"
                  className="w-full pl-9 h-10 rounded-md border bg-secondary text-sm text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                  {...register("role")}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs tracking-wider uppercase text-muted-foreground">
                Mot de passe {!isEditing && <span className="text-primary">*</span>}
                {isEditing && <span className="text-muted-foreground/50 ml-1">(laisser vide pour ne pas modifier)</span>}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input id="password" type="password"
                  placeholder={isEditing ? "••••••••" : "8 caractères minimum"}
                  className={cn("pl-9 bg-secondary border-border", errors.password && "border-destructive")}
                  {...register("password")} />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" className="flex-1 border border-border hover:bg-accent"
                onClick={() => onOpenChange(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider uppercase"
                disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  User,
  Wrench,
  Clock,
  StickyNote,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Client } from "@/types"

const briefSchema = z.object({
  client_id: z.string().uuid("Sélectionnez un client"),
  travaux_description: z
    .string()
    .min(10, "Description trop courte (10 caractères minimum)"),
  materials: z.string().optional(),
  delai: z.string().min(1, "Délai requis"),
  notes_internes: z.string().optional(),
})

const createClientSchema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères minimum)"),
  email: z.string().optional(),
  phone: z.string().optional(),
})

type BriefFormValues = z.infer<typeof briefSchema>
type CreateClientValues = z.infer<typeof createClientSchema>

interface QuoteRequestFormProps {
  clients: Client[]
}

export function QuoteRequestForm({ clients: initialClients }: QuoteRequestFormProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BriefFormValues>({
    resolver: zodResolver(briefSchema),
  })

  const {
    register: registerClient,
    handleSubmit: handleSubmitClient,
    reset: resetClient,
    formState: { errors: clientErrors, isSubmitting: isCreatingClient },
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
  })

  async function onSubmit(values: BriefFormValues) {
    try {
      const res = await fetch("/api/devis/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erreur lors de la création du devis")
      }

      toast.success("Brief enregistré", {
        description: "Le devis a été créé en brouillon.",
      })
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue")
    }
  }

  async function onCreateClient(values: CreateClientValues) {
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
        }),
      })

      if (!res.ok) throw new Error("Erreur lors de la création du client")

      const { client } = await res.json()
      setClients((prev) =>
        [...prev, client].sort((a, b) => a.name.localeCompare(b.name, "fr"))
      )
      setValue("client_id", client.id, { shouldValidate: true })
      resetClient()
      setDialogOpen(false)
      toast.success(`Client « ${client.name} » créé`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue")
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          {/* 01 — CLIENT */}
          <section className="p-6 border-b border-border">
            <SectionHeader index="01" icon={User} label="Client" />
            <div className="mt-4 flex gap-3 items-start">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="client_id">Client *</Label>
                <div className="relative">
                  <select
                    id="client_id"
                    data-slot="select"
                    aria-invalid={!!errors.client_id}
                    className="h-8 w-full appearance-none rounded-lg border border-input bg-card px-2.5 pr-8 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 cursor-pointer"
                    {...register("client_id")}
                  >
                    <option value="">— Sélectionner un client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                </div>
                {errors.client_id && (
                  <p className="text-xs text-destructive">
                    {errors.client_id.message}
                  </p>
                )}
              </div>
              <div className="mt-[22px] shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDialogOpen(true)}
                  title="Créer un nouveau client"
                >
                  <Plus />
                </Button>
              </div>
            </div>
            {clients.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground/70">
                Aucun client enregistré.{" "}
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="text-primary underline-offset-3 hover:underline"
                >
                  Créer le premier client
                </button>
              </p>
            )}
          </section>

          {/* 02 — TRAVAUX */}
          <section className="p-6 border-b border-border">
            <SectionHeader index="02" icon={Wrench} label="Travaux" />
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="travaux_description">Description des travaux *</Label>
              <Textarea
                id="travaux_description"
                rows={5}
                placeholder="Décrivez les travaux à réaliser : nature, localisation, matériaux envisagés, contraintes techniques…"
                aria-invalid={!!errors.travaux_description}
                {...register("travaux_description")}
              />
              {errors.travaux_description && (
                <p className="text-xs text-destructive">
                  {errors.travaux_description.message}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="materials">Matériaux évoqués</Label>
              <Input
                id="materials"
                placeholder="Ex : acier galvanisé, aluminium, inox 304…"
                {...register("materials")}
              />
              <p className="text-[11px] text-muted-foreground/60">Optionnel</p>
            </div>
          </section>

          {/* 03 — LOGISTIQUE */}
          <section className="p-6 border-b border-border">
            <SectionHeader index="03" icon={Clock} label="Logistique" />
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="delai">Délai souhaité *</Label>
              <Input
                id="delai"
                placeholder="Ex : 3 semaines, avant le 15 juin, fin de mois…"
                aria-invalid={!!errors.delai}
                {...register("delai")}
              />
              {errors.delai && (
                <p className="text-xs text-destructive">{errors.delai.message}</p>
              )}
            </div>
          </section>

          {/* 04 — NOTES INTERNES */}
          <section className="p-6">
            <SectionHeader index="04" icon={StickyNote} label="Notes internes" />
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="notes_internes">Notes internes</Label>
              <Textarea
                id="notes_internes"
                rows={3}
                placeholder="Préférences client, historique, conditions particulières…"
                {...register("notes_internes")}
              />
              <p className="text-[11px] text-muted-foreground/60">
                Optionnel — non visible par le client
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Le brief est sauvegardé avant la génération IA.
            </p>
            <Button type="submit" disabled={isSubmitting} className="shrink-0 gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  Générer le devis
                  <ChevronRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Quick create client dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmitClient(onCreateClient)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-client-name">Nom *</Label>
              <Input
                id="new-client-name"
                placeholder="Nom complet ou raison sociale"
                aria-invalid={!!clientErrors.name}
                {...registerClient("name")}
              />
              {clientErrors.name && (
                <p className="text-xs text-destructive">
                  {clientErrors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-client-email">Email</Label>
              <Input
                id="new-client-email"
                type="email"
                placeholder="client@exemple.com"
                {...registerClient("email")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-client-phone">Téléphone</Label>
              <Input
                id="new-client-phone"
                type="tel"
                placeholder="06 00 00 00 00"
                {...registerClient("phone")}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={isCreatingClient}>
                {isCreatingClient ? "Création…" : "Créer le client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SectionHeader({
  index,
  icon: Icon,
  label,
}: {
  index: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums select-none">
        {index}
      </span>
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

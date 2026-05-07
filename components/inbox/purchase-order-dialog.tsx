"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { EmailAttachment, PurchaseOrderExtraction } from "@/types"

type Client = { id: string; name: string; email: string | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  messageId: string
  attachment: EmailAttachment
  clients: Client[]
}

const itemSchema = z.object({
  label: z.string().min(1, "Désignation requise"),
  quantity: z.number().positive("Quantité > 0"),
  unit: z.string().min(1, "Unité requise"),
  unit_price: z.number().nonnegative("Prix ≥ 0"),
})

const confirmFormSchema = z.object({
  client_id: z.string().nullable(),
  client_name: z.string().min(1, "Nom requis"),
  client_email: z.string().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  client_address: z.string().nullable().optional(),
  project_title: z.string().min(1, "Titre requis"),
  order_reference: z.string().nullable().optional(),
  delivery_deadline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tva_rate: z.number().min(0).max(100),
  validity_days: z.number().int().positive(),
  items: z.array(itemSchema).min(1, "Au moins une ligne requise"),
})
type ConfirmForm = z.infer<typeof confirmFormSchema>

type Step = "extracting" | "review" | "confirming" | "done"

type DoneResult = { projectId: string; quoteId: string; clientId: string }

function buildDefaultValues(extraction: PurchaseOrderExtraction, clients: Client[]): ConfirmForm {
  const matchedClient = extraction.client_email
    ? clients.find((c) => c.email?.toLowerCase() === extraction.client_email?.toLowerCase())
    : null

  return {
    client_id: matchedClient?.id ?? null,
    client_name: matchedClient?.name ?? extraction.client_name ?? "",
    client_email: extraction.client_email ?? "",
    client_phone: extraction.client_phone ?? "",
    client_address: extraction.client_address ?? "",
    project_title: extraction.order_reference
      ? `Commande ${extraction.order_reference}`
      : extraction.client_name
        ? `Commande ${extraction.client_name}`
        : "Nouvelle commande",
    order_reference: extraction.order_reference ?? "",
    delivery_deadline: extraction.delivery_deadline ?? "",
    notes: extraction.notes ?? "",
    tva_rate: 20,
    validity_days: 30,
    items: extraction.items.map((item) => ({
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price ?? 0,
    })),
  }
}

export function PurchaseOrderDialog({ open, onOpenChange, messageId, attachment, clients }: Props) {
  const [step, setStep] = useState<Step>("extracting")
  const [extraction, setExtraction] = useState<PurchaseOrderExtraction | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [result, setResult] = useState<DoneResult | null>(null)
  const [isConfirming, startConfirming] = useTransition()

  const form = useForm<ConfirmForm>({
    resolver: zodResolver(confirmFormSchema),
    defaultValues: {
      client_id: null,
      client_name: "",
      client_email: "",
      client_phone: "",
      client_address: "",
      project_title: "",
      order_reference: "",
      delivery_deadline: "",
      notes: "",
      tva_rate: 20,
      validity_days: 30,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })

  const selectedClientId = form.watch("client_id")

  // Run extraction when dialog opens.
  useEffect(() => {
    if (!open) return
    setStep("extracting")
    setExtraction(null)
    setExtractError(null)
    setResult(null)
    form.reset()

    fetch("/api/agents/email/extract-purchase-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId,
        attachmentId: attachment.attachmentId,
        mimeType: attachment.mimeType,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(err.error ?? "Erreur extraction")
        }
        return res.json() as Promise<PurchaseOrderExtraction>
      })
      .then((data) => {
        setExtraction(data)
        form.reset(buildDefaultValues(data, clients))
        setStep("review")
      })
      .catch((err: unknown) => {
        setExtractError(err instanceof Error ? err.message : "Erreur lors de l'extraction")
        setStep("review")
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messageId, attachment.attachmentId])

  function onSubmit(values: ConfirmForm) {
    startConfirming(async () => {
      setStep("confirming")
      try {
        const res = await fetch("/api/agents/email/confirm-purchase-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(err.error ?? "Erreur création")
        }
        const data = (await res.json()) as DoneResult
        setResult(data)
        setStep("done")
        toast.success("Projet et devis créés avec succès")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la création")
        setStep("review")
      }
    })
  }

  const totalHT = form
    .watch("items")
    .reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={step !== "confirming"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Bon de commande — {attachment.filename}
          </DialogTitle>
        </DialogHeader>

        {/* Extracting */}
        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-mono">Analyse du document en cours…</p>
          </div>
        )}

        {/* Review or Confirming */}
        {(step === "review" || step === "confirming") && (
          <>
            {extractError && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                {extractError}
              </div>
            )}

            {extraction && extraction.confidence < 0.6 && (
              <div className="flex items-start gap-2 rounded border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-500">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                Confiance faible ({Math.round(extraction.confidence * 100)}%) — vérifiez les données extraites.
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Client */}
              <section className="space-y-3">
                <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground border-b border-border pb-1">
                  Client
                </p>

                <div>
                  <Label className="text-xs">Client existant</Label>
                  <select
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedClientId ?? ""}
                    onChange={(e) =>
                      form.setValue("client_id", e.target.value || null, { shouldValidate: true })
                    }
                  >
                    <option value="">— Nouveau client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.email ? ` (${c.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedClientId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nom *</Label>
                      <Input
                        className="mt-1 text-xs h-8"
                        {...form.register("client_name")}
                      />
                      {form.formState.errors.client_name && (
                        <p className="text-[10px] text-destructive mt-0.5">
                          {form.formState.errors.client_name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        className="mt-1 text-xs h-8"
                        type="email"
                        {...form.register("client_email")}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Téléphone</Label>
                      <Input className="mt-1 text-xs h-8" {...form.register("client_phone")} />
                    </div>
                    <div>
                      <Label className="text-xs">Adresse</Label>
                      <Input className="mt-1 text-xs h-8" {...form.register("client_address")} />
                    </div>
                  </div>
                )}
              </section>

              {/* Project */}
              <section className="space-y-3">
                <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground border-b border-border pb-1">
                  Projet
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Titre du projet *</Label>
                    <Input
                      className="mt-1 text-xs h-8"
                      {...form.register("project_title")}
                    />
                    {form.formState.errors.project_title && (
                      <p className="text-[10px] text-destructive mt-0.5">
                        {form.formState.errors.project_title.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Référence commande</Label>
                    <Input
                      className="mt-1 text-xs h-8"
                      {...form.register("order_reference")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Délai souhaité</Label>
                    <Input
                      className="mt-1 text-xs h-8"
                      placeholder="ex: 2024-06-30"
                      {...form.register("delivery_deadline")}
                    />
                  </div>
                </div>
              </section>

              {/* Items */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                    Lignes de commande
                  </p>
                  <button
                    type="button"
                    onClick={() => append({ label: "", quantity: 1, unit: "u", unit_price: 0 })}
                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="size-3" />
                    Ajouter
                  </button>
                </div>

                {form.formState.errors.items?.root && (
                  <p className="text-[10px] text-destructive">
                    {form.formState.errors.items.root.message}
                  </p>
                )}

                <div className="space-y-2">
                  {/* Header */}
                  {fields.length > 0 && (
                    <div className="grid grid-cols-[1fr_60px_60px_80px_28px] gap-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground px-0.5">
                      <span>Désignation</span>
                      <span>Qté</span>
                      <span>Unité</span>
                      <span>PU HT (€)</span>
                      <span />
                    </div>
                  )}

                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-[1fr_60px_60px_80px_28px] gap-1.5 items-start">
                      <div>
                        <Input
                          className="text-xs h-7"
                          placeholder="Désignation"
                          {...form.register(`items.${idx}.label`)}
                        />
                        {form.formState.errors.items?.[idx]?.label && (
                          <p className="text-[9px] text-destructive mt-0.5">
                            {form.formState.errors.items[idx]?.label?.message}
                          </p>
                        )}
                      </div>
                      <Input
                        className="text-xs h-7"
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                      />
                      <Input
                        className="text-xs h-7"
                        placeholder="u"
                        {...form.register(`items.${idx}.unit`)}
                      />
                      <Input
                        className="text-xs h-7"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`items.${idx}.unit_price`, { valueAsNumber: true })}
                      />
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className={cn(
                          "flex items-center justify-center size-7 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors",
                          fields.length === 1 && "opacity-40 cursor-not-allowed"
                        )}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}

                  {fields.length > 0 && (
                    <div className="flex justify-end pt-1">
                      <p className="text-xs font-mono text-foreground">
                        Total HT :{" "}
                        <span className="font-bold">
                          {totalHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Quote settings */}
              <section className="space-y-3">
                <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground border-b border-border pb-1">
                  Devis
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">TVA (%)</Label>
                    <Input
                      className="mt-1 text-xs h-8"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...form.register("tva_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Validité (jours)</Label>
                    <Input
                      className="mt-1 text-xs h-8"
                      type="number"
                      min="1"
                      {...form.register("validity_days", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    className="mt-1 text-xs resize-none"
                    rows={2}
                    {...form.register("notes")}
                  />
                </div>
              </section>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isConfirming || step === "confirming"}
                  className="font-mono text-xs tracking-wider uppercase"
                >
                  {isConfirming || step === "confirming" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  Créer projet + devis
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {/* Done */}
        {step === "done" && result && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="size-12 rounded-sm bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle2 className="size-6 text-emerald-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-sm">Projet et devis créés</p>
              <p className="text-xs text-muted-foreground">
                La commande a été importée et un devis brouillon a été pré-rempli.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/devis/${result.quoteId}`}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                <ExternalLink className="size-3" />
                Voir le devis
              </a>
              <button
                onClick={() => onOpenChange(false)}
                className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

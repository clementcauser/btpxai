"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Save,
  Send,
  Download,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { QuoteWithItems, QuoteStatus } from "@/types"
import {
  saveQuoteAction,
  sendQuoteAction,
} from "@/app/(bureau)/devis/[id]/preview/actions"

// ─── Local types ──────────────────────────────────────────────────────────────

type LocalItem = {
  id?: string
  tempId: string
  label: string
  quantity: number
  unit_price: number
  unit: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TVA_OPTIONS = [
  { label: "0 %", value: 0 },
  { label: "10 %", value: 10 },
  { label: "20 %", value: 20 },
]

const VALIDITY_OPTIONS = [15, 30, 45, 60]

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
}

const STATUS_VARIANTS: Record<
  QuoteStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  accepted: "secondary",
  rejected: "destructive",
  expired: "secondary",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

function newTempId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuoteEditorProps {
  quote: QuoteWithItems
}

export function QuoteEditor({ quote }: QuoteEditorProps) {
  const [items, setItems] = useState<LocalItem[]>(
    quote.items.map((item) => ({
      id: item.id,
      tempId: item.id,
      label: item.label,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit: item.unit ?? "",
    }))
  )
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [notes, setNotes] = useState(quote.notes ?? "")
  const [tvaRate, setTvaRate] = useState(quote.tva_rate ?? 20)
  const [validityDays, setValidityDays] = useState(quote.validity_days ?? 30)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [status, setStatus] = useState<QuoteStatus>(quote.status)
  const [isDownloading, setIsDownloading] = useState(false)

  // ─── Derived totals (real-time) ───────────────────────────────────────────

  const totalHT = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const totalTVA = totalHT * (tvaRate / 100)
  const totalTTC = totalHT + totalTVA

  // ─── Item mutations ───────────────────────────────────────────────────────

  const updateItem = useCallback(
    (tempId: string, field: keyof LocalItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.tempId === tempId ? { ...item, [field]: value } : item
        )
      )
      setIsDirty(true)
    },
    []
  )

  const deleteItem = useCallback((item: LocalItem) => {
    if (item.id) {
      setDeletedItemIds((prev) => [...prev, item.id!])
    }
    setItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
    setIsDirty(true)
  }, [])

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        tempId: newTempId(),
        label: "",
        quantity: 1,
        unit_price: 0,
        unit: "u",
      },
    ])
    setIsDirty(true)
  }, [])

  // ─── Serialise items for server actions ───────────────────────────────────

  function buildSaveInput() {
    return {
      quoteId: quote.id,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit || null,
      })),
      notes: notes || null,
      tva_rate: tvaRate,
      validity_days: validityDays,
      deletedItemIds,
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await saveQuoteAction(buildSaveInput())
      if (result.success) {
        setDeletedItemIds([])
        setIsDirty(false)
        toast.success("Devis sauvegardé")
      } else {
        toast.error(result.error ?? "Erreur lors de la sauvegarde")
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    setSendDialogOpen(false)
    setIsSending(true)
    try {
      const saveResult = await saveQuoteAction(buildSaveInput())
      if (!saveResult.success) {
        toast.error(saveResult.error ?? "Erreur lors de la sauvegarde")
        return
      }
      const sendResult = await sendQuoteAction(quote.id)
      if (sendResult.success) {
        setStatus("sent")
        setDeletedItemIds([])
        setIsDirty(false)
        toast.success("Devis envoyé")
      } else {
        toast.error(sendResult.error ?? "Erreur lors de l'envoi")
      }
    } finally {
      setIsSending(false)
    }
  }

  // ─── Download PDF ─────────────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/devis/${quote.id}/pdf`)
      if (!res.ok) {
        toast.error("Erreur lors de la génération du PDF")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const ref =
        quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
      a.href = url
      a.download = `${ref}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("PDF téléchargé")
    } catch {
      toast.error("Erreur lors du téléchargement")
    } finally {
      setIsDownloading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="space-y-6"
      style={{ animation: "fadeSlideIn 0.3s ease forwards" }}
    >
      {/* ── Status bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANTS[status]}>
            {STATUS_LABELS[status]}
          </Badge>
          {isDirty && (
            <span className="font-mono text-[10px] text-primary/70 uppercase tracking-[0.15em]">
              • Modifications non sauvegardées
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">
            Validité
          </span>
          <div className="flex items-center gap-1">
            {VALIDITY_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setValidityDays(days)
                  setIsDirty(true)
                }}
                className={cn(
                  "font-mono text-xs px-2 py-1 rounded-sm border transition-colors",
                  validityDays === days
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                )}
              >
                {days}j
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Editable table ─────────────────────────────────────────────── */}
      <div className="rounded-sm border border-border overflow-hidden bg-card">
        {/* Table header — desktop */}
        <div className="hidden sm:grid grid-cols-[2rem_1fr_5rem_5rem_7.5rem_7.5rem_2.5rem] border-b border-border bg-muted/30">
          <div className="px-3 py-2.5" />
          {(
            [
              ["Désignation", "text-left"],
              ["Qté", "text-right"],
              ["Unité", "text-center"],
              ["P.U. H.T.", "text-right"],
              ["Total H.T.", "text-right"],
            ] as [string, string][]
          ).map(([label, align]) => (
            <div
              key={label}
              className={cn(
                "px-3 py-2.5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]",
                align
              )}
            >
              {label}
            </div>
          ))}
          <div className="px-2 py-2.5" />
        </div>

        {/* Item rows */}
        {items.map((item, i) => {
          const lineTotal = item.quantity * item.unit_price
          return (
            <div
              key={item.tempId}
              className="border-b border-border/60 last:border-0 hover:bg-muted/10 transition-colors"
              style={{
                animation: "fadeSlideIn 0.25s ease forwards",
                animationDelay: `${i * 30}ms`,
                opacity: 0,
              }}
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[2rem_1fr_5rem_5rem_7.5rem_7.5rem_2.5rem] items-center">
                {/* Row number */}
                <div className="px-3 py-2">
                  <span className="font-mono text-[10px] text-primary/40 tabular-nums select-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Label */}
                <div className="px-2 py-1.5">
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      updateItem(item.tempId, "label", e.target.value)
                    }
                    placeholder="Désignation…"
                    className="h-8 border-transparent bg-transparent hover:border-border/50 focus:border-primary/50 focus:bg-primary/5 text-sm transition-colors"
                    data-testid={`item-label-${i}`}
                  />
                </div>

                {/* Quantity */}
                <div className="px-2 py-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.tempId,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 border-transparent bg-transparent hover:border-border/50 focus:border-primary/50 focus:bg-primary/5 font-mono tabular-nums text-right text-sm transition-colors"
                    data-testid={`item-quantity-${i}`}
                  />
                </div>

                {/* Unit */}
                <div className="px-2 py-1.5">
                  <Input
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.tempId, "unit", e.target.value)
                    }
                    placeholder="u."
                    className="h-8 border-transparent bg-transparent hover:border-border/50 focus:border-primary/50 focus:bg-primary/5 font-mono text-sm text-center transition-colors"
                    data-testid={`item-unit-${i}`}
                  />
                </div>

                {/* Unit price */}
                <div className="px-2 py-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(
                        item.tempId,
                        "unit_price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 border-transparent bg-transparent hover:border-border/50 focus:border-primary/50 focus:bg-primary/5 font-mono tabular-nums text-right text-sm transition-colors"
                    data-testid={`item-unit-price-${i}`}
                  />
                </div>

                {/* Line total — computed */}
                <div className="px-4 py-2 flex items-center justify-end">
                  <span
                    className="font-mono text-sm tabular-nums font-semibold text-foreground"
                    data-testid={`item-total-${i}`}
                  >
                    {fmtEur(lineTotal)}
                  </span>
                </div>

                {/* Delete */}
                <div className="px-2 py-2 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => deleteItem(item)}
                    className="size-6 flex items-center justify-center rounded-sm text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    data-testid={`delete-item-${i}`}
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile row */}
              <div className="sm:hidden px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-primary/40 tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      updateItem(item.tempId, "label", e.target.value)
                    }
                    placeholder="Désignation…"
                    className="h-8 flex-1 border-border/50 bg-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => deleteItem(item)}
                    className="size-8 flex items-center justify-center rounded-sm text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.tempId,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 w-20 border-border/50 bg-transparent font-mono tabular-nums text-right text-sm"
                    placeholder="Qté"
                  />
                  <Input
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.tempId, "unit", e.target.value)
                    }
                    placeholder="u."
                    className="h-8 w-16 border-border/50 bg-transparent font-mono text-sm text-center"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(
                        item.tempId,
                        "unit_price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 flex-1 border-border/50 bg-transparent font-mono tabular-nums text-right text-sm"
                    placeholder="Prix unitaire"
                  />
                  <span className="font-mono text-sm tabular-nums font-semibold text-primary shrink-0">
                    {fmtEur(lineTotal)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add row */}
        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-dashed border-border/50"
          data-testid="add-item-button"
        >
          <Plus className="size-3.5" />
          Ajouter une ligne
        </button>
      </div>

      {/* ── Totals ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        {/* TVA selector */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">
            Taux TVA
          </span>
          <div className="flex items-center gap-1">
            {TVA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTvaRate(opt.value)
                  setIsDirty(true)
                }}
                className={cn(
                  "font-mono text-xs px-2.5 py-1 rounded-sm border transition-colors",
                  tvaRate === opt.value
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Totals panel */}
        <div className="w-full sm:w-auto min-w-[220px] rounded-sm border border-border bg-muted/20 px-5 py-4 space-y-1.5">
          <div className="flex items-center justify-between gap-8">
            <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">
              Total H.T.
            </span>
            <span
              className="font-mono text-sm tabular-nums text-foreground"
              data-testid="quote-total-ht"
            >
              {fmtEur(totalHT)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">
              TVA {tvaRate} %
            </span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {fmtEur(totalTVA)}
            </span>
          </div>
          <Separator className="my-2 opacity-30" />
          <div className="flex items-center justify-between gap-8">
            <span className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em] font-semibold">
              Total T.T.C.
            </span>
            <span
              className="font-mono text-base tabular-nums font-bold text-primary"
              data-testid="quote-total-ttc"
            >
              {fmtEur(totalTTC)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">
          Notes & conditions particulières
        </label>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            setIsDirty(true)
          }}
          placeholder="Notes internes, délais d'exécution, conditions de paiement, garanties…"
          rows={3}
          className="text-sm resize-y"
        />
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {isDirty
            ? "Modifications en attente de sauvegarde."
            : "Toutes les modifications sont sauvegardées."}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="gap-1.5"
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Sauvegarder
          </Button>
          <Button
            size="sm"
            onClick={() => setSendDialogOpen(true)}
            disabled={isSending || status === "sent"}
            className="gap-1.5"
          >
            {isSending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {status === "sent" ? "Envoyé" : "Envoyer"}
          </Button>
        </div>
      </div>

      {/* ── Send confirmation dialog ────────────────────────────────────── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Envoyer le devis ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Le devis sera sauvegardé et marqué comme envoyé. Le statut passera
            à <strong className="text-foreground">Envoyé</strong> et ne pourra
            plus être modifié.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button size="sm" onClick={handleSend} className="gap-1.5">
              <Send className="size-3.5" />
              Confirmer l&apos;envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

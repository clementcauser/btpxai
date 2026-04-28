"use client"

import { useRouter } from "next/navigation"
import { Zap, Info, ArrowRight, RotateCcw, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type GeneratedItem = {
  label: string
  quantity: number
  unit: string
  unit_price: number
}

interface GeneratedQuotePreviewProps {
  quoteId: string
  items: GeneratedItem[]
  notes: string
  onRegenerate: () => void
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

export function GeneratedQuotePreview({
  items = [],
  notes,
  onRegenerate,
}: GeneratedQuotePreviewProps) {
  const router = useRouter()
  const totalHT = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center size-9 rounded-sm border border-primary/40 bg-primary/10"
            style={{ animation: "forgePulse 2.8s ease-in-out 1" }}
          >
            <Zap className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-mono text-[10px] text-primary/60 uppercase tracking-[0.18em]">
              Génération IA complète
            </p>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wide text-foreground leading-none mt-0.5">
              {items.length} ligne{items.length > 1 ? "s" : ""} de devis
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 shrink-0"
        >
          <RotateCcw className="size-3" />
          Régénérer
        </button>
      </div>

      {/* Items table */}
      <div className="rounded-sm border border-border overflow-hidden bg-card">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2rem_1fr_5rem_4.5rem_7rem_7rem] border-b border-border bg-muted/30">
          <div className="px-3 py-2.5" />
          <div className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">
            Désignation
          </div>
          <div className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] text-right">
            Qté
          </div>
          <div className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] text-right">
            Unité
          </div>
          <div className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] text-right">
            P.U. H.T.
          </div>
          <div className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] text-right">
            Total H.T.
          </div>
        </div>

        {/* Item rows */}
        {items.map((item, i) => {
          const lineTotal = item.quantity * item.unit_price
          return (
            <div
              key={i}
              className={cn(
                "border-b border-border/60 last:border-0",
                "opacity-0 hover:bg-muted/20 transition-colors",
                "flex flex-col sm:grid sm:grid-cols-[2rem_1fr_5rem_4.5rem_7rem_7rem]"
              )}
              style={{
                animation: `fadeSlideIn 0.3s ease forwards`,
                animationDelay: `${i * 55}ms`,
              }}
            >
              {/* Row number */}
              <div className="hidden sm:flex px-3 py-3 items-center">
                <span className="font-mono text-[10px] text-primary/40 tabular-nums select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden flex items-start justify-between gap-2 px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-primary/40 tabular-nums select-none shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-foreground font-medium">{item.label}</span>
                </div>
                <span className="font-mono text-sm tabular-nums font-semibold text-primary shrink-0">
                  {fmtEur(lineTotal)}
                </span>
              </div>
              <div className="sm:hidden flex items-center gap-3 px-4 pb-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {item.quantity}
                </span>
                <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm">
                  {item.unit}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums ml-auto">
                  × {fmtEur(item.unit_price)}
                </span>
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:flex px-3 py-3 items-center">
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
              <div className="hidden sm:flex px-3 py-3 items-center justify-end">
                <span className="font-mono text-sm tabular-nums text-foreground/90">
                  {item.quantity}
                </span>
              </div>
              <div className="hidden sm:flex px-3 py-3 items-center justify-end">
                <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm">
                  {item.unit}
                </span>
              </div>
              <div className="hidden sm:flex px-3 py-3 items-center justify-end">
                <span className="font-mono text-sm tabular-nums text-foreground/90">
                  {fmtEur(item.unit_price)}
                </span>
              </div>
              <div className="hidden sm:flex px-4 py-3 items-center justify-end">
                <span className="font-mono text-sm tabular-nums font-semibold text-foreground">
                  {fmtEur(lineTotal)}
                </span>
              </div>
            </div>
          )
        })}

        {/* Total row */}
        <div className="border-t border-primary/25 bg-primary/[0.07] flex sm:grid sm:grid-cols-[2rem_1fr_5rem_4.5rem_7rem_7rem] items-center justify-between sm:justify-normal">
          <div className="hidden sm:block sm:col-span-5 px-4 py-3">
            <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              Total H.T. estimé
            </span>
          </div>
          <div className="px-4 py-3 sm:flex items-center justify-end w-full sm:w-auto">
            <span className="sm:hidden font-mono text-[10px] text-muted-foreground/60 uppercase tracking-[0.15em] mr-3">
              Total H.T.
            </span>
            <span
              className="font-mono text-lg tabular-nums font-bold text-primary"
              style={{
                animation: `fadeSlideIn 0.4s ease forwards`,
                animationDelay: `${items.length * 55 + 80}ms`,
                opacity: 0,
              }}
            >
              {fmtEur(totalHT)}
            </span>
          </div>
        </div>
      </div>

      {/* AI notes callout */}
      {notes && (
        <div
          className="flex gap-3 rounded-sm border border-primary/20 bg-primary/[0.06] px-4 py-3.5"
          style={{
            animation: `fadeSlideIn 0.35s ease forwards`,
            animationDelay: `${items.length * 55 + 150}ms`,
            opacity: 0,
          }}
        >
          <Info className="size-3.5 text-primary/60 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{notes}</p>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border pt-5"
        style={{
          animation: `fadeSlideIn 0.35s ease forwards`,
          animationDelay: `${items.length * 55 + 220}ms`,
          opacity: 0,
        }}
      >
        <p className="text-xs text-muted-foreground">
          Lignes enregistrées — modifiables depuis la page du devis.
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="gap-1.5 shrink-0"
        >
          <FileText className="size-3.5" />
          Tableau de bord
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

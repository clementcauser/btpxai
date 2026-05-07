"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Sheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  RefreshCw,
} from "lucide-react"
import type { SyncResult } from "@/lib/sheets"

type Props = {
  lastSyncAt: string | null
  sheetsSpreadsheetUrl: string | null
}

type SyncState =
  | { kind: "idle" }
  | { kind: "success"; results: SyncResult[]; syncedAt: string }
  | { kind: "error"; message: string }

const urlSchema = z.object({
  url: z
    .string()
    .url({ message: "URL Google Sheets invalide" })
    .refine((v) => v.includes("docs.google.com/spreadsheets"), {
      message: "URL Google Sheets invalide",
    }),
})
type UrlForm = z.infer<typeof urlSchema>

function formatLastSync(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SheetsSyncSection({ lastSyncAt, sheetsSpreadsheetUrl }: Props) {
  const [currentUrl, setCurrentUrl] = useState(sheetsSpreadsheetUrl)
  const [syncState, setSyncState] = useState<SyncState>({ kind: "idle" })
  const [displayedLastSync, setDisplayedLastSync] = useState(lastSyncAt)
  const [isSavingUrl, startSaveTransition] = useTransition()
  const [isSyncing, startSyncTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlForm>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: sheetsSpreadsheetUrl ?? "" },
  })

  function onSaveUrl(data: UrlForm) {
    startSaveTransition(async () => {
      const res = await fetch("/api/parametres/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "sheets_spreadsheet_url", value: data.url }),
      })
      if (!res.ok) {
        toast.error("Erreur lors de la sauvegarde de l'URL")
        return
      }
      setCurrentUrl(data.url)
      toast.success("URL Google Sheets sauvegardée")
    })
  }

  function handleSync() {
    startSyncTransition(async () => {
      setSyncState({ kind: "idle" })
      const res = await fetch("/api/parametres/sheets-sync", { method: "POST" })
      const data = (await res.json()) as {
        results?: SyncResult[]
        syncedAt?: string
        hasError?: boolean
        error?: string
      }

      if (!res.ok || data.error) {
        setSyncState({ kind: "error", message: data.error ?? "Erreur inconnue" })
        return
      }

      setSyncState({
        kind: "success",
        results: data.results ?? [],
        syncedAt: data.syncedAt ?? new Date().toISOString(),
      })

      if (!data.hasError && data.syncedAt) {
        setDisplayedLastSync(data.syncedAt)
      }
    })
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <div
          className="mt-0.5 size-7 rounded-sm flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.60 0.14 145 / 0.15)" }}
        >
          <Sheet className="size-3.5" style={{ color: "oklch(0.60 0.14 145)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-0.5">
            Synchronisation
          </p>
          <h3 className="text-sm font-medium text-foreground leading-snug">
            Google Sheets
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Exporte les devis, projets en cours et CA mensuel. Synchronisation automatique chaque jour à 6h.
          </p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* URL configuration */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            URL du fichier
          </p>

          <form onSubmit={handleSubmit(onSaveUrl)} className="flex gap-2">
            <div className="flex-1 min-w-0">
              <input
                {...register("url")}
                data-testid="sheets-url-input"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className={[
                  "w-full rounded-sm border bg-background px-3 py-2 text-sm text-foreground",
                  "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1",
                  "transition-colors",
                  errors.url
                    ? "border-destructive focus:ring-destructive/40"
                    : "border-border focus:ring-primary/40",
                ].join(" ")}
              />
              {errors.url && (
                <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3 shrink-0" />
                  {errors.url.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              data-testid="sheets-url-save-btn"
              disabled={isSavingUrl}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSavingUrl ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Sauvegarder
            </button>
          </form>

          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="sheets-open-link"
              className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: "oklch(0.60 0.14 145 / 0.4)",
                color: "oklch(0.60 0.14 145)",
                background: "oklch(0.60 0.14 145 / 0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "oklch(0.60 0.14 145 / 0.12)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "oklch(0.60 0.14 145 / 0.06)"
              }}
            >
              <ExternalLink className="size-3.5 shrink-0" />
              Ouvrir le Google Sheet
            </a>
          )}
        </div>

        {/* Sync controls */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Synchronisation manuelle
          </p>

          {displayedLastSync && (
            <p className="text-xs text-muted-foreground">
              Dernière sync :{" "}
              <span className="text-foreground">{formatLastSync(displayedLastSync)}</span>
            </p>
          )}

          {syncState.kind === "success" && (
            <div className="rounded-sm border border-border bg-muted/20 px-3 py-2.5 space-y-1.5">
              {syncState.results.map((r) => (
                <div key={r.sheet} className="flex items-center gap-2 text-xs">
                  {r.status === "success" ? (
                    <CheckCircle2 className="size-3.5 shrink-0" style={{ color: "oklch(0.60 0.14 145)" }} />
                  ) : (
                    <AlertCircle className="size-3.5 shrink-0 text-destructive" />
                  )}
                  <span className={r.status === "error" ? "text-destructive" : "text-foreground"}>
                    {r.sheet}
                    {r.status === "success" && r.rowCount !== undefined && (
                      <span className="text-muted-foreground">
                        {" "}— {r.rowCount} ligne{r.rowCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {r.status === "error" && r.error && (
                      <span className="text-muted-foreground"> — {r.error}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {syncState.kind === "error" && (
            <div className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>{syncState.message}</span>
            </div>
          )}

          <button
            onClick={handleSync}
            data-testid="sheets-sync-btn"
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {isSyncing ? "Synchronisation…" : "Synchroniser maintenant"}
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Sheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import type { SyncResult } from "@/lib/sheets"

type Props = {
  lastSyncAt: string | null
}

type SyncState =
  | { kind: "idle" }
  | { kind: "success"; results: SyncResult[]; syncedAt: string }
  | { kind: "error"; message: string }

function formatLastSync(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SheetsSyncSection({ lastSyncAt }: Props) {
  const [syncState, setSyncState] = useState<SyncState>({ kind: "idle" })
  const [displayedLastSync, setDisplayedLastSync] = useState(lastSyncAt)
  const [isPending, startTransition] = useTransition()

  function handleSync() {
    startTransition(async () => {
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
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Sheet className="size-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Synchronisation Google Sheets</h3>
          <p className="text-sm text-muted-foreground">
            Exporte les devis, les projets en cours et le CA mensuel vers un Google Sheet. La
            synchronisation automatique tourne chaque jour à 6h.
          </p>
        </div>
      </div>

      {displayedLastSync && (
        <p className="text-xs text-muted-foreground">
          Dernière sync : {formatLastSync(displayedLastSync)}
        </p>
      )}

      {syncState.kind === "success" && (
        <div className="space-y-1">
          {syncState.results.map((r) => (
            <div key={r.sheet} className="flex items-center gap-2 text-sm">
              {r.status === "success" ? (
                <CheckCircle2 className="size-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-destructive shrink-0" />
              )}
              <span className={r.status === "error" ? "text-destructive" : "text-foreground"}>
                {r.sheet}
                {r.status === "success" && r.rowCount !== undefined && (
                  <span className="text-muted-foreground"> — {r.rowCount} ligne{r.rowCount !== 1 ? "s" : ""}</span>
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
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{syncState.message}</span>
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sheet className="size-4" />
        )}
        {isPending ? "Synchronisation…" : "Synchroniser maintenant"}
      </button>
    </div>
  )
}

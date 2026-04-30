"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Brain, RotateCcw, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  clientId: string
  clientName: string
  currentEmailSubject?: string
  currentEmailSnippet?: string
  invalidationKey?: number
}

type CachedEntry = { summary: string; cachedAt: string }

function cacheKey(clientId: string) {
  return `client-summary-v1-${clientId}`
}

function readCache(clientId: string): string | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(clientId))
    if (!raw) return null
    return (JSON.parse(raw) as CachedEntry).summary
  } catch {
    return null
  }
}

function writeCache(clientId: string, summary: string) {
  try {
    const entry: CachedEntry = { summary, cachedAt: new Date().toISOString() }
    sessionStorage.setItem(cacheKey(clientId), JSON.stringify(entry))
  } catch {}
}

export function clearClientSummaryCache(clientId: string) {
  try {
    sessionStorage.removeItem(cacheKey(clientId))
  } catch {}
}

export function ClientSummaryPanel({
  clientId,
  clientName,
  currentEmailSubject,
  currentEmailSnippet,
  invalidationKey = 0,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSummary = useCallback(
    async (skipCache: boolean) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (!skipCache) {
        const cached = readCache(clientId)
        if (cached) {
          setSummary(cached)
          setRevealed(true)
          return
        }
      }

      setIsLoading(true)
      setHasError(false)
      setSummary(null)
      setRevealed(false)

      try {
        const res = await fetch("/api/agents/email/client-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            currentEmailSubject,
            currentEmailSnippet,
          }),
          signal: controller.signal,
        })

        if (!res.ok) throw new Error()
        const data = (await res.json()) as { summary: string }
        writeCache(clientId, data.summary)
        setSummary(data.summary)
        // Slight delay before reveal so the loader fades out cleanly
        setTimeout(() => setRevealed(true), 80)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setHasError(true)
        }
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, invalidationKey]
  )

  useEffect(() => {
    setRevealed(false)
    fetchSummary(false)
    return () => abortRef.current?.abort()
  }, [fetchSummary])

  return (
    <div className="relative border border-border bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="relative size-3.5 shrink-0">
            <Brain
              className={cn(
                "size-3.5 transition-colors",
                isLoading ? "text-primary animate-pulse" : "text-primary/70"
              )}
            />
            {isLoading && (
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
            Contexte client
          </span>
        </div>

        {!isLoading && (summary || hasError) && (
          <button
            onClick={() => fetchSummary(true)}
            title="Régénérer le résumé"
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
          >
            <RotateCcw className="size-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2.5 min-h-[72px] flex items-start">
        {isLoading && (
          <div className="w-full space-y-1.5 pt-0.5" aria-label="Chargement du résumé">
            <div className="h-2 bg-muted/60 rounded-sm animate-pulse w-full" />
            <div className="h-2 bg-muted/60 rounded-sm animate-pulse w-[90%]" />
            <div className="h-2 bg-muted/60 rounded-sm animate-pulse w-[75%]" />
            <div className="h-2 bg-muted/60 rounded-sm animate-pulse w-[82%]" />
          </div>
        )}

        {hasError && !isLoading && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-amber-500/70" />
            <p className="text-[11px] leading-relaxed">
              Impossible de générer le résumé.{" "}
              <button
                onClick={() => fetchSummary(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Réessayer
              </button>
            </p>
          </div>
        )}

        {summary && !isLoading && (
          <p
            className={cn(
              "text-[11.5px] leading-[1.65] text-foreground/85 transition-all duration-500",
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
          >
            {summary}
          </p>
        )}
      </div>

      {/* Subtle AI watermark */}
      {summary && !isLoading && (
        <div className="absolute bottom-1.5 right-2.5">
          <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground/40">
            IA · {clientName}
          </span>
        </div>
      )}

      {/* Scan-line accent on load */}
      {isLoading && (
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          style={{ animation: "scan 1.4s ease-in-out infinite" }}
        />
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

import type { Metadata } from "next"
import { AlertTriangle } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { getAllAlertes } from "@/lib/terrain-alertes"
import type { AlerteTerrainWithProject } from "@/types"
import AlertesFeed from "@/components/bureau/alertes-feed"

export const metadata: Metadata = {
  title: "Alertes terrain — BTP×AI",
}

export default async function AlertesPage() {
  let alertes: AlerteTerrainWithProject[] = []

  try {
    alertes = await getAllAlertes(supabaseService)
  } catch {
    alertes = []
  }

  const openCount = alertes.filter(
    (a) => a.status === "ouvert" || a.status === "pris_en_charge"
  ).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-3.5 text-destructive" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">
              Interface bureau
            </span>
          </div>
          <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
            Alertes terrain
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signalements envoyés par les ouvriers depuis le chantier.
          </p>
        </div>

        {openCount > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-sm shrink-0"
            style={{ background: "oklch(0.28 0.14 25)", border: "1px solid oklch(0.45 0.18 25)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "oklch(0.62 0.22 25)", animation: "alertPulse 2.4s ease infinite" }}
            />
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-barlow)", color: "oklch(0.92 0.2 25)" }}
            >
              {openCount} en cours
            </span>
          </div>
        )}
      </div>

      {/* Feed — always mounted so useEffect can fetch client-side (testable via cy.intercept) */}
      <AlertesFeed initialAlertes={alertes} />
    </div>
  )
}

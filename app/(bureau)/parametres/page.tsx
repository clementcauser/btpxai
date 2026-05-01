import type { Metadata } from "next"
import { Settings } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { GmailConnectionSection } from "@/components/parametres/gmail-connection-section"
import { AutoAcknowledgmentSection } from "@/components/parametres/auto-acknowledgment-section"
import { SheetsSyncSection } from "@/components/parametres/sheets-sync-section"
import { getAutoAcknowledgmentEnabled } from "@/lib/acknowledgments"
import { getLastSyncAt } from "@/lib/sheets"

export const metadata: Metadata = {
  title: "Paramètres — BTP×AI",
}

type SearchParams = Promise<{ gmail?: string }>

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { gmail } = await searchParams

  const [{ data: connection }, autoAckEnabled, lastSyncAt] = await Promise.all([
    supabaseService.from("gmail_connections").select("email, created_at").limit(1).single(),
    getAutoAcknowledgmentEnabled(),
    getLastSyncAt(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Configuration
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les intégrations et la configuration de l'application.
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
          Intégrations
        </h2>
        <GmailConnectionSection connection={connection} gmailParam={gmail} />
      </div>

      <div className="max-w-2xl space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
          Automatisations
        </h2>
        <AutoAcknowledgmentSection initialEnabled={autoAckEnabled} />
        <SheetsSyncSection lastSyncAt={lastSyncAt} />
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { FileText, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getClients } from "@/lib/clients"
import { QuoteRequestForm } from "@/components/devis/quote-request-form"

export const metadata: Metadata = {
  title: "Nouveau devis — BTP×AI",
}

export default async function NouveauDevisPage() {
  const supabase = await createClient()
  const clients = await getClients(supabase).catch(() => [])

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3" />
              Tableau de bord
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">
              Devis
            </span>
          </div>
          <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground mt-0.5">
            Nouveau brief
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Renseignez le brief client pour générer un devis automatiquement.
          </p>
        </div>
      </div>

      <QuoteRequestForm clients={clients} />
    </div>
  )
}

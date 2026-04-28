import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getQuotesForTable } from "@/lib/quotes"
import { QuotesTable } from "@/components/devis/quotes-table"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Devis — BTP×AI",
}

export default async function DevisPage() {
  const supabase = await createClient()
  const quotes = await getQuotesForTable(supabase).catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">
              Gestion
            </span>
          </div>
          <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
            Devis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {quotes.length} devis au total · suivi des statuts et actions rapides
          </p>
        </div>
        <Link href="/devis/nouveau" className={buttonVariants()}>
          <Plus className="size-4" />
          Nouveau devis
        </Link>
      </div>

      <QuotesTable quotes={quotes} />
    </div>
  )
}

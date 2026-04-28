import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getQuoteWithContext } from "@/lib/quotes"
import { QuoteEditor } from "@/components/devis/quote-editor"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Devis #${id.slice(0, 8).toUpperCase()} — BTP×AI`,
  }
}

export default async function QuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  let quote
  try {
    quote = await getQuoteWithContext(supabase, id)
  } catch {
    notFound()
  }

  const reference =
    quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`

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
            {reference}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Révisez et modifiez le devis avant envoi au client.
          </p>
        </div>
      </div>

      <QuoteEditor quote={quote} />
    </div>
  )
}

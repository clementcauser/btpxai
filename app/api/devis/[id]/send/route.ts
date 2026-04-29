import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Resend } from "resend"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { createClient } from "@/lib/supabase/server"
import { getQuoteWithContext, updateQuote } from "@/lib/quotes"
import { QuotePDFDocument } from "@/components/devis/quote-pdf-document"
import { buildQuoteEmailHtml, buildQuoteEmailSubject } from "@/lib/email/quote"
import { env } from "@/lib/env"
import { auth } from "@/lib/auth"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()

  let quote
  try {
    quote = await getQuoteWithContext(supabase, id)
  } catch {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
  }

  const clientEmail = quote.project.client.email
  if (!clientEmail) {
    return NextResponse.json(
      { error: "Le client n'a pas d'adresse email" },
      { status: 422 }
    )
  }

  // Generate PDF buffer
  let pdfBuffer: Buffer
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(QuotePDFDocument, { quote }) as any
    pdfBuffer = await renderToBuffer(element)
  } catch (err) {
    console.error("[send] pdf render error", err)
    return NextResponse.json(
      { error: "Erreur de génération du PDF" },
      { status: 500 }
    )
  }

  const ref = quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`

  // Send email via Resend
  const resend = new Resend(env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: "BTP × AI Métallerie <devis@btpxai.fr>",
      to: [clientEmail],
      subject: buildQuoteEmailSubject(quote),
      html: buildQuoteEmailHtml(quote),
      attachments: [
        {
          filename: `${ref}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
  } catch (err) {
    console.error("[send] resend error", err)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    )
  }

  // Update quote status
  try {
    await updateQuote(supabase, id, {
      status: "sent",
      sent_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[send] db update error", err)
    return NextResponse.json(
      { error: "Email envoyé mais erreur lors de la mise à jour du statut" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

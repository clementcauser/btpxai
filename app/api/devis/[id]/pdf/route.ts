import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { createClient, getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { getQuoteWithContext } from "@/lib/quotes"
import { QuotePDFDocument } from "@/components/devis/quote-pdf-document"
import { requireWorkspace } from "@/lib/workspaces"
import { getCompanyInfo, getAppSetting } from "@/lib/settings"

const BUCKET = "quotes-pdf"

async function ensureBucket() {
  const { data: buckets } = await supabaseService.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    await supabaseService.storage.createBucket(BUCKET, { public: false })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()

  const { workspaceId } = await requireWorkspace(user.id)

  const [company, conditionsRaw] = await Promise.all([
    getCompanyInfo(workspaceId),
    getAppSetting(workspaceId, "quote_conditions"),
  ])
  const conditions: string[] = (() => {
    try {
      const parsed: unknown = JSON.parse(conditionsRaw ?? "[]")
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch {
      return []
    }
  })()

  let quote
  try {
    quote = await getQuoteWithContext(supabase, id)
  } catch {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
  }

  const ref =
    quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
  const filename = `${ref}.pdf`

  // Generate PDF buffer
  let buffer: Buffer
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(QuotePDFDocument, { quote, company, conditions }) as any
    buffer = await renderToBuffer(element)
  } catch (err) {
    console.error("[pdf] render error", err)
    return NextResponse.json(
      { error: "Erreur de génération du PDF" },
      { status: 500 }
    )
  }

  // Store in Supabase Storage (best-effort, don't fail the download)
  try {
    await ensureBucket()
    await supabaseService.storage
      .from(BUCKET)
      .upload(`${id}.pdf`, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })
  } catch (err) {
    console.warn("[pdf] storage upload failed (non-blocking)", err)
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  })
}

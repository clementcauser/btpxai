import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

export const maxDuration = 30

const confirmItemSchema = z.object({
  label: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unit_price: z.number().nonnegative(),
})

const confirmSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1, "Nom client requis"),
  client_email: z.string().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  client_address: z.string().nullable().optional(),
  project_title: z.string().min(1, "Titre du projet requis"),
  project_description: z.string().nullable().optional(),
  order_reference: z.string().nullable().optional(),
  delivery_deadline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tva_rate: z.number().min(0).max(100).default(20),
  validity_days: z.number().int().positive().default(30),
  items: z.array(confirmItemSchema).min(1, "Au moins une ligne de commande requise"),
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  let workspaceId: string
  try {
    const ws = await requireWorkspace(user.id)
    workspaceId = ws.workspaceId
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const {
    client_id,
    client_name,
    client_email,
    client_phone,
    client_address,
    project_title,
    project_description,
    order_reference,
    delivery_deadline,
    notes,
    tva_rate,
    validity_days,
    items,
  } = parsed.data

  try {
    // 1. Resolve client: use existing or create new
    let resolvedClientId = client_id ?? null

    if (!resolvedClientId) {
      const { data: newClient, error: clientError } = await supabaseService
        .from("clients")
        .insert({
          name: client_name,
          email: client_email ?? null,
          phone: client_phone ?? null,
          address: client_address ?? null,
          workspace_id: workspaceId,
        })
        .select("id")
        .single()

      if (clientError) throw new Error(`Erreur création client : ${clientError.message}`)
      resolvedClientId = newClient.id
    }

    // 2. Create project
    const { data: project, error: projectError } = await supabaseService
      .from("projects")
      .insert({
        client_id: resolvedClientId,
        title: project_title,
        description: project_description ?? null,
        status: "planned",
        workspace_id: workspaceId,
      })
      .select("id")
      .single()

    if (projectError) throw new Error(`Erreur création projet : ${projectError.message}`)

    // 3. Create quote
    const { data: quote, error: quoteError } = await supabaseService
      .from("quotes")
      .insert({
        project_id: project.id,
        reference: order_reference ?? null,
        tva_rate,
        validity_days,
        notes: buildNotes(notes, delivery_deadline),
        status: "draft",
        total_ht: 0,
        workspace_id: workspaceId,
      })
      .select("id")
      .single()

    if (quoteError) throw new Error(`Erreur création devis : ${quoteError.message}`)

    // 4. Create quote items
    const { error: itemsError } = await supabaseService.from("quote_items").insert(
      items.map((item) => ({
        quote_id: quote.id,
        label: item.label,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        workspace_id: workspaceId,
      }))
    )

    if (itemsError) throw new Error(`Erreur création lignes : ${itemsError.message}`)

    // 5. Update quote total
    const total_ht =
      Math.round(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) * 100) / 100

    await supabaseService.from("quotes").update({ total_ht }).eq("id", quote.id)

    return NextResponse.json(
      { clientId: resolvedClientId, projectId: project.id, quoteId: quote.id },
      { status: 201 }
    )
  } catch (err) {
    console.error("Confirm purchase order error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors de la création" },
      { status: 500 }
    )
  }
}

function buildNotes(notes: string | null | undefined, deliveryDeadline: string | null | undefined): string | null {
  const parts: string[] = []
  if (deliveryDeadline) parts.push(`Délai souhaité : ${deliveryDeadline}`)
  if (notes) parts.push(notes)
  return parts.length > 0 ? parts.join("\n") : null
}

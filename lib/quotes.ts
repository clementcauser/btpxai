import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type {
  Quote,
  QuoteItem,
  QuoteWithItems,
  QuoteWithContext,
  QuoteForTable,
  CreateQuoteInput,
  UpdateQuoteInput,
  CreateQuoteItemInput,
  UpdateQuoteItemInput,
} from "@/types"

type Supabase = SupabaseClient<Database>

export async function getQuotes(supabase: Supabase): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getQuotesForTable(
  supabase: Supabase
): Promise<QuoteForTable[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, project:projects(id, title, client:clients(id, name))")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as unknown as QuoteForTable[]
}

export async function duplicateQuote(
  supabase: Supabase,
  workspaceId: string,
  id: string
): Promise<Quote> {
  const original = await getQuote(supabase, id)

  const newQuote = await createQuote(supabase, workspaceId, {
    project_id: original.project_id,
    tva_rate: original.tva_rate,
    notes: original.notes,
    validity_days: original.validity_days,
  })

  if (original.items.length > 0) {
    const { error } = await supabase.from("quote_items").insert(
      original.items.map((item) => ({
        workspace_id: workspaceId,
        quote_id: newQuote.id,
        label: item.label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit,
      }))
    )
    if (error) throw error
  }

  const total_ht =
    Math.round(
      original.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      ) * 100
    ) / 100

  return await updateQuote(supabase, newQuote.id, { total_ht })
}

export async function getQuote(
  supabase: Supabase,
  id: string
): Promise<QuoteWithItems> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", id)
    .single()

  if (error) throw error
  return data as QuoteWithItems
}

export async function getQuoteWithContext(
  supabase: Supabase,
  id: string
): Promise<QuoteWithContext> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*), project:projects(*, client:clients(*))")
    .eq("id", id)
    .single()

  if (error) throw error
  return data as unknown as QuoteWithContext
}

export async function createQuote(
  supabase: Supabase,
  workspaceId: string,
  input: CreateQuoteInput
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .insert({ ...input, workspace_id: workspaceId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuote(
  supabase: Supabase,
  id: string,
  input: UpdateQuoteInput
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuote(
  supabase: Supabase,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)

  if (error) throw error
}

async function recalculateTotal(
  supabase: Supabase,
  quoteId: string
): Promise<void> {
  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("quantity, unit_price")
    .eq("quote_id", quoteId)

  if (itemsError) throw itemsError

  const total_ht =
    Math.round(
      items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) *
        100
    ) / 100

  const { error } = await supabase
    .from("quotes")
    .update({ total_ht })
    .eq("id", quoteId)

  if (error) throw error
}

export async function addQuoteItem(
  supabase: Supabase,
  workspaceId: string,
  input: CreateQuoteItemInput
): Promise<QuoteItem> {
  const { data, error } = await supabase
    .from("quote_items")
    .insert({ ...input, workspace_id: workspaceId })
    .select()
    .single()

  if (error) throw error
  await recalculateTotal(supabase, input.quote_id)
  return data
}

export async function updateQuoteItem(
  supabase: Supabase,
  id: string,
  quoteId: string,
  input: UpdateQuoteItemInput
): Promise<QuoteItem> {
  const { data, error } = await supabase
    .from("quote_items")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  await recalculateTotal(supabase, quoteId)
  return data
}

export async function deleteQuoteItem(
  supabase: Supabase,
  id: string,
  quoteId: string
): Promise<void> {
  const { error } = await supabase
    .from("quote_items")
    .delete()
    .eq("id", id)

  if (error) throw error
  await recalculateTotal(supabase, quoteId)
}

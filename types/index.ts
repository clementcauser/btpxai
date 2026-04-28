import type { Tables, Enums } from "@/types/supabase"

export type Client = Tables<"clients">
export type Project = Tables<"projects">

export type CreateClientInput = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

export type QuoteStatus = Enums<"quote_status">

export type Quote = Tables<"quotes">

export type QuoteItem = Tables<"quote_items">

export type QuoteWithItems = Quote & { items: QuoteItem[] }

export type QuoteWithContext = QuoteWithItems & {
  project: Project & {
    client: Client
  }
}

export type CreateQuoteInput = {
  project_id: string
  tva_rate?: number
  notes?: string | null
  validity_days?: number
  reference?: string | null
}

export type UpdateQuoteInput = Partial<{
  status: QuoteStatus
  total_ht: number
  tva_rate: number
  notes: string | null
  validity_days: number
  reference: string | null
  sent_at: string | null
}>

export type CreateQuoteItemInput = {
  quote_id: string
  label: string
  quantity: number
  unit_price: number
  unit?: string | null
}

export type UpdateQuoteItemInput = Partial<{
  label: string
  quantity: number
  unit_price: number
  unit: string | null
}>

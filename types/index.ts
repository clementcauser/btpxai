import type { Tables, Enums } from "@/types/supabase"

export type Client = Tables<"clients">
export type Project = Tables<"projects">

export type ClientWithQuotes = Client & {
  projects: Array<
    Project & {
      quotes: Array<
        Pick<
          Tables<"quotes">,
          "id" | "reference" | "status" | "total_ht" | "tva_rate" | "created_at" | "sent_at"
        >
      >
    }
  >
}

export type CreateClientInput = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

export type UpdateClientInput = Partial<{
  name: string
  email: string | null
  phone: string | null
  address: string | null
}>

export type QuoteStatus = Enums<"quote_status">

export type Quote = Tables<"quotes">

export type QuoteItem = Tables<"quote_items">

export type QuoteWithItems = Quote & { items: QuoteItem[] }

export type QuoteWithContext = QuoteWithItems & {
  project: Project & {
    client: Client
  }
}

export type QuoteForTable = Quote & {
  project: (Project & { client: Pick<Client, "id" | "name"> }) | null
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

export type EmailStatus = "a_traiter" | "en_cours" | "repondu" | "archive"

export type EmailCategory = "demande_devis" | "suivi_commande" | "question" | "autre"

export type EmailClassification = {
  category: EmailCategory
  confidence: number
  reasoning: string
}

export type EmailStatusRecord = {
  id: string
  message_id: string
  thread_id: string
  status: EmailStatus
  client_id: string | null
  created_at: string
  updated_at: string
}

export type LinkedClient = {
  id: string
  name: string
  email: string | null
}

export type EmailSummaryWithStatus = EmailSummary & {
  statusRecord: EmailStatusRecord | null
  linkedClient: LinkedClient | null
}

export type GmailConnection = {
  id: string
  email: string
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export type EmailSummary = {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  isRead: boolean
}

export type EmailDetail = EmailSummary & {
  body: string
}

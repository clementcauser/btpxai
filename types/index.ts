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
  category: EmailCategory | null
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

export type EmailAcknowledgment = {
  id: string
  message_id: string
  thread_id: string
  sender_email: string
  client_name: string | null
  sent_at: string
}

export type AppSetting = {
  key: string
  value: string
  updated_at: string
}

export type ReminderType = "quote_j7" | "quote_j14" | "payment"

export type QuoteReminder = {
  id: string
  quote_id: string
  type: ReminderType
  sent_at: string
  email_to: string
}

// ─── Terrain (ouvrier) types ─────────────────────────────────────────────────

export type TerrainNote = {
  id: string
  project_id: string
  user_id: string
  transcription: string | null
  audio_url: string | null
  created_at: string
}

export type TerrainPhoto = {
  id: string
  project_id: string
  user_id: string
  photo_url: string
  lat: number | null
  lng: number | null
  created_at: string
}

export type MateriauxUrgency = "normal" | "urgent" | "critique"
export type MateriauxStatus = "pending" | "ordered" | "delivered"

export type MateriauxRequest = {
  id: string
  project_id: string
  user_id: string
  label: string
  quantity: string
  urgency: MateriauxUrgency
  status: MateriauxStatus
  created_at: string
}

export type ProjectStep = Tables<"project_steps">

export type ProblemeUrgency = "faible" | "elevee" | "critique"

export type AlerteStatus = "ouvert" | "pris_en_charge" | "resolu"

export type AlerteTerrain = {
  id: string
  project_id: string | null
  user_id: string
  urgency: ProblemeUrgency
  description: string
  photo_url: string | null
  status: AlerteStatus
  handled_by: string | null
  handled_at: string | null
  resolved_at: string | null
  created_at: string
}

export type AlerteTerrainWithProject = AlerteTerrain & {
  projects: { id: string; title: string } | null
}

export type ProblemeReport = {
  id: string
  project_id: string
  user_id: string
  urgency: ProblemeUrgency
  description: string
  created_at: string
}

export type ProjectWithClient = {
  id: string
  title: string
  description: string | null
  status: "planned" | "in_progress" | "completed" | "cancelled"
  client_id: string
  created_at: string
  clients: { id: string; name: string } | null
}

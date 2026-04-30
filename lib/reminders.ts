import { supabaseService } from "@/lib/supabase/service"
import type { ReminderType, QuoteReminder, QuoteWithContext } from "@/types"

const REMINDER_DAYS: Record<ReminderType, number> = {
  quote_j7: 7,
  quote_j14: 14,
  payment: 7,
}

const REMINDER_STATUS: Record<ReminderType, string> = {
  quote_j7: "sent",
  quote_j14: "sent",
  payment: "accepted",
}

export async function getQuotesDueForReminder(
  type: ReminderType
): Promise<QuoteWithContext[]> {
  const days = REMINDER_DAYS[type]
  const status = REMINDER_STATUS[type]
  const threshold = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString()

  // Collect quote IDs that already have this reminder type
  const { data: existing } = await supabaseService
    .from("quote_reminders")
    .select("quote_id")
    .eq("type", type)

  const alreadySentIds = new Set((existing ?? []).map((r) => r.quote_id))

  const { data: quotes, error } = await supabaseService
    .from("quotes")
    .select("*, items:quote_items(*), project:projects(*, client:clients(*))")
    .eq("status", status)
    .eq("reminders_enabled", true)
    .lte("sent_at", threshold)
    .not("sent_at", "is", null)

  if (error) throw error

  return ((quotes ?? []) as unknown as QuoteWithContext[]).filter(
    (q) => !alreadySentIds.has(q.id)
  )
}

export async function logReminder(
  quoteId: string,
  type: ReminderType,
  emailTo: string
): Promise<QuoteReminder> {
  const { data, error } = await supabaseService
    .from("quote_reminders")
    .insert({ quote_id: quoteId, type, email_to: emailTo })
    .select()
    .single()

  if (error) throw error
  return data as QuoteReminder
}

export async function hasReminder(
  quoteId: string,
  type: ReminderType
): Promise<boolean> {
  const { data } = await supabaseService
    .from("quote_reminders")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("type", type)
    .limit(1)

  return Boolean(data?.length)
}

export async function setQuoteRemindersEnabled(
  quoteId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabaseService
    .from("quotes")
    .update({ reminders_enabled: enabled })
    .eq("id", quoteId)

  if (error) throw error
}

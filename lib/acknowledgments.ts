import { supabaseService } from "@/lib/supabase/service"
import type { EmailAcknowledgment } from "@/types"

const DEDUP_WINDOW_MINUTES = 30

export async function getAutoAcknowledgmentEnabled(): Promise<boolean> {
  const { data } = await supabaseService
    .from("app_settings")
    .select("value")
    .eq("key", "auto_acknowledgment_enabled")
    .single()

  return data?.value === "true"
}

export async function setAutoAcknowledgmentEnabled(enabled: boolean): Promise<void> {
  await supabaseService.from("app_settings").upsert(
    { key: "auto_acknowledgment_enabled", value: String(enabled), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  )
}

export async function hasRecentAcknowledgment(senderEmail: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data } = await supabaseService
    .from("email_acknowledgments")
    .select("id")
    .eq("sender_email", senderEmail.toLowerCase())
    .gte("sent_at", since)
    .limit(1)

  return Boolean(data?.length)
}

export async function logAcknowledgment(
  messageId: string,
  threadId: string,
  senderEmail: string,
  clientName?: string | null
): Promise<EmailAcknowledgment> {
  const { data, error } = await supabaseService
    .from("email_acknowledgments")
    .insert({
      message_id: messageId,
      thread_id: threadId,
      sender_email: senderEmail.toLowerCase(),
      client_name: clientName ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as EmailAcknowledgment
}

export async function getLastPollAt(): Promise<Date | null> {
  const { data } = await supabaseService
    .from("app_settings")
    .select("value")
    .eq("key", "acknowledgment_last_poll_at")
    .single()

  return data?.value ? new Date(data.value) : null
}

export async function setLastPollAt(date: Date): Promise<void> {
  await supabaseService.from("app_settings").upsert(
    { key: "acknowledgment_last_poll_at", value: date.toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  )
}

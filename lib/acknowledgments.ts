import { supabaseService } from "@/lib/supabase/service"
import type { EmailAcknowledgment } from "@/types"

const DEDUP_WINDOW_MINUTES = 30

export async function getAutoAcknowledgmentEnabled(workspaceId: string): Promise<boolean> {
  const { data } = await supabaseService
    .from("workspace_settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "auto_acknowledgment_enabled")
    .single()

  return data?.value === "true"
}

export async function setAutoAcknowledgmentEnabled(
  workspaceId: string,
  enabled: boolean
): Promise<void> {
  await supabaseService.from("workspace_settings").upsert(
    {
      workspace_id: workspaceId,
      key: "auto_acknowledgment_enabled",
      value: String(enabled),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,key" }
  )
}

export async function hasRecentAcknowledgment(
  workspaceId: string,
  senderEmail: string
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data } = await supabaseService
    .from("email_acknowledgments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("sender_email", senderEmail.toLowerCase())
    .gte("sent_at", since)
    .limit(1)

  return Boolean(data?.length)
}

export async function logAcknowledgment(
  workspaceId: string,
  messageId: string,
  threadId: string,
  senderEmail: string,
  clientName?: string | null
): Promise<EmailAcknowledgment> {
  const { data, error } = await supabaseService
    .from("email_acknowledgments")
    .insert({
      workspace_id: workspaceId,
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

export async function getLastPollAt(workspaceId: string): Promise<Date | null> {
  const { data } = await supabaseService
    .from("workspace_settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "acknowledgment_last_poll_at")
    .single()

  return data?.value ? new Date(data.value) : null
}

export async function setLastPollAt(workspaceId: string, date: Date): Promise<void> {
  await supabaseService.from("workspace_settings").upsert(
    {
      workspace_id: workspaceId,
      key: "acknowledgment_last_poll_at",
      value: date.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,key" }
  )
}

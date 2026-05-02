import { supabaseService } from "@/lib/supabase/service"
import type { EmailCategory, EmailStatus, EmailStatusRecord, LinkedClient } from "@/types"

export async function getEmailStatuses(
  workspaceId: string,
  messageIds: string[]
): Promise<Record<string, EmailStatusRecord>> {
  if (!messageIds.length) return {}

  const { data } = await supabaseService
    .from("email_statuses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("message_id", messageIds)

  if (!data) return {}

  return Object.fromEntries(data.map((r) => [r.message_id, r as EmailStatusRecord]))
}

export async function upsertEmailStatus(
  workspaceId: string,
  messageId: string,
  threadId: string,
  status: EmailStatus,
  clientId?: string | null
): Promise<EmailStatusRecord> {
  const payload: {
    workspace_id: string
    message_id: string
    thread_id: string
    status: EmailStatus
    client_id?: string | null
  } = { workspace_id: workspaceId, message_id: messageId, thread_id: threadId, status }

  if (clientId !== undefined) payload.client_id = clientId

  const { data, error } = await supabaseService
    .from("email_statuses")
    .upsert(payload, { onConflict: "workspace_id,message_id" })
    .select()
    .single()

  if (error) throw error
  return data as EmailStatusRecord
}

export async function saveEmailCategory(
  workspaceId: string,
  messageId: string,
  threadId: string,
  category: EmailCategory
): Promise<void> {
  const { error } = await supabaseService
    .from("email_statuses")
    .upsert(
      { workspace_id: workspaceId, message_id: messageId, thread_id: threadId, category },
      { onConflict: "workspace_id,message_id" }
    )

  if (error) throw error
}

export async function findClientByEmailAddress(
  workspaceId: string,
  emailAddress: string
): Promise<LinkedClient | null> {
  const cleanEmail = emailAddress
    .replace(/^.*<(.+)>.*$/, "$1")
    .trim()
    .toLowerCase()

  const { data } = await supabaseService
    .from("clients")
    .select("id, name, email")
    .eq("workspace_id", workspaceId)
    .ilike("email", cleanEmail)
    .maybeSingle()

  return data as LinkedClient | null
}

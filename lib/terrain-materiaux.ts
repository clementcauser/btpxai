import type { SupabaseClient } from "@supabase/supabase-js"
import type { MateriauxRequest, MateriauxStatus } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

export async function getMateriauxRequests(
  supabase: AnyClient,
  projectId: string
): Promise<MateriauxRequest[]> {
  const { data, error } = await supabase
    .from("materiaux_requests")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as MateriauxRequest[]
}

export async function getAllMateriauxRequests(
  supabase: AnyClient
): Promise<(MateriauxRequest & { projects: { title: string } | null })[]> {
  const { data, error } = await supabase
    .from("materiaux_requests")
    .select("*, projects(title)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as (MateriauxRequest & { projects: { title: string } | null })[]
}

export async function createMateriauxRequest(
  supabase: AnyClient,
  workspaceId: string,
  payload: {
    project_id: string
    user_id: string
    label: string
    quantity: string
    urgency: string
    comment?: string | null
    photo_url?: string | null
  }
): Promise<MateriauxRequest> {
  const { data, error } = await supabase
    .from("materiaux_requests")
    .insert({
      project_id: payload.project_id,
      user_id: payload.user_id,
      label: payload.label,
      quantity: payload.quantity,
      urgency: payload.urgency,
      comment: payload.comment ?? null,
      photo_url: payload.photo_url ?? null,
      status: "pending",
      workspace_id: workspaceId,
    })
    .select()
    .single()

  if (error) throw error
  return data as MateriauxRequest
}

export async function updateMateriauxStatus(
  supabase: AnyClient,
  id: string,
  status: MateriauxStatus
): Promise<MateriauxRequest> {
  const { data, error } = await supabase
    .from("materiaux_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as MateriauxRequest
}

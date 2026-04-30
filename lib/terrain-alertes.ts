import type { SupabaseClient } from "@supabase/supabase-js"
import type { AlerteTerrain, AlerteStatus, AlerteTerrainWithProject, ProblemeUrgency } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

export async function getAlertesForProject(
  supabase: AnyClient,
  projectId: string
): Promise<AlerteTerrain[]> {
  const { data, error } = await supabase
    .from("alertes_terrain")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as AlerteTerrain[]
}

export async function getAllAlertes(
  supabase: AnyClient
): Promise<AlerteTerrainWithProject[]> {
  const { data, error } = await supabase
    .from("alertes_terrain")
    .select("*, projects(id, title)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as AlerteTerrainWithProject[]
}

export async function getOpenAlertesCount(supabase: AnyClient): Promise<number> {
  const { count, error } = await supabase
    .from("alertes_terrain")
    .select("id", { count: "exact", head: true })
    .in("status", ["ouvert", "pris_en_charge"])

  if (error) return 0
  return count ?? 0
}

export async function createAlerte(
  supabase: AnyClient,
  payload: {
    project_id: string | null
    user_id: string
    urgency: ProblemeUrgency
    description: string
    photo_url?: string | null
  }
): Promise<AlerteTerrain> {
  const { data, error } = await supabase
    .from("alertes_terrain")
    .insert({
      project_id: payload.project_id,
      user_id: payload.user_id,
      urgency: payload.urgency,
      description: payload.description,
      photo_url: payload.photo_url ?? null,
      status: "ouvert",
    })
    .select()
    .single()

  if (error) throw error
  return data as AlerteTerrain
}

export async function updateAlerteStatus(
  supabase: AnyClient,
  id: string,
  status: AlerteStatus,
  handledBy?: string
): Promise<AlerteTerrain> {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status }

  if (status === "pris_en_charge") {
    update.handled_at = now
    update.handled_by = handledBy ?? null
  } else if (status === "resolu") {
    update.resolved_at = now
  }

  const { data, error } = await supabase
    .from("alertes_terrain")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as AlerteTerrain
}

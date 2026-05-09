import type { SupabaseClient } from "@supabase/supabase-js"
import type { ProjectStep } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

export async function getProjectSteps(
  supabase: AnyClient,
  projectId: string
): Promise<ProjectStep[]> {
  const { data, error } = await supabase
    .from("project_steps")
    .select("*")
    .eq("project_id", projectId)
    .order("order", { ascending: true })

  if (error) throw error
  return (data ?? []) as ProjectStep[]
}

export async function createProjectStep(
  supabase: AnyClient,
  payload: { project_id: string; label: string; order: number; workspace_id: string }
): Promise<ProjectStep> {
  const { data, error } = await supabase
    .from("project_steps")
    .insert({
      project_id: payload.project_id,
      label: payload.label,
      order: payload.order,
      workspace_id: payload.workspace_id,
      completed_at: null,
      completed_by: null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectStep
}

export async function updateProjectStep(
  supabase: AnyClient,
  id: string,
  payload: Partial<{
    label: string
    order: number
    completed_at: string | null
    completed_by: string | null
  }>
): Promise<ProjectStep> {
  const { data, error } = await supabase
    .from("project_steps")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as ProjectStep
}

export async function deleteProjectStep(supabase: AnyClient, id: string): Promise<void> {
  const { error } = await supabase.from("project_steps").delete().eq("id", id)
  if (error) throw error
}

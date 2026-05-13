import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type {
  ProjectForTable,
  ProjectWithDetails,
} from "@/types"

type Supabase = SupabaseClient<Database>

export async function getProjectsForTable(
  supabase: Supabase
): Promise<ProjectForTable[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, client:clients(id, name), quotes(id, total_ht, status)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as unknown as ProjectForTable[]
}

export async function getProjectWithDetails(
  supabase: Supabase,
  id: string
): Promise<ProjectWithDetails> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, client:clients(*), quotes(*, items:quote_items(*)), project_steps(*)")
    .eq("id", id)
    .single()

  if (error) throw error

  const [tasks, members, notes, photos] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .then(({ data }) => data ?? []),
    supabase
      .from("project_members")
      .select("*, user:user(id, name, email, image)")
      .eq("project_id", id)
      .then(({ data }) => data ?? []),
    supabase
      .from("terrain_notes")
      .select("*")
      .eq("project_id", id)
      .then(({ data }) => data ?? []),
    supabase
      .from("terrain_photos")
      .select("*")
      .eq("project_id", id)
      .then(({ data }) => data ?? []),
  ])

  return {
    ...project,
    tasks: tasks as ProjectWithDetails["tasks"],
    project_members: members as ProjectWithDetails["project_members"],
    terrain_notes: notes as ProjectWithDetails["terrain_notes"],
    terrain_photos: photos as ProjectWithDetails["terrain_photos"],
  } as unknown as ProjectWithDetails
}

export async function addProjectMember(
  supabase: Supabase,
  projectId: string,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: userId,
    workspace_id: workspaceId,
  })

  if (error) throw error
}

export async function removeProjectMember(
  supabase: Supabase,
  projectId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)

  if (error) throw error
}

export function computeProjectTotal(
  quotes: { total_ht: number | null; status: string }[]
): number {
  return quotes
    .filter((q) => q.status !== "rejected" && q.status !== "expired")
    .reduce((sum, q) => sum + (q.total_ht ?? 0), 0)
}

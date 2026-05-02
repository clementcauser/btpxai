import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { TerrainNote } from "@/types"

type Supabase = SupabaseClient<Database>

type CreateTerrainNoteInput = {
  project_id: string
  user_id: string
  transcription: string | null
  audio_url: string | null
}

export async function getTerrainNotes(
  supabase: Supabase,
  projectId: string
): Promise<TerrainNote[]> {
  const { data, error } = await supabase
    .from("terrain_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as TerrainNote[]
}

export async function createTerrainNote(
  supabase: Supabase,
  workspaceId: string,
  input: CreateTerrainNoteInput
): Promise<TerrainNote> {
  const { data, error } = await supabase
    .from("terrain_notes")
    .insert({ ...input, workspace_id: workspaceId })
    .select()
    .single()
  if (error) throw error
  return data as TerrainNote
}

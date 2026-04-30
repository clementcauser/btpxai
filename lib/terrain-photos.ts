import type { SupabaseClient } from "@supabase/supabase-js"
import type { TerrainPhoto } from "@/types"

// terrain_photos is not yet in the generated types (pending migration apply + regen)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supabase = SupabaseClient<any>

type CreateTerrainPhotoInput = {
  project_id: string
  user_id: string
  photo_url: string
  lat: number | null
  lng: number | null
}

export async function getTerrainPhotos(
  supabase: Supabase,
  projectId: string
): Promise<TerrainPhoto[]> {
  const { data, error } = await supabase
    .from("terrain_photos")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as TerrainPhoto[]
}

export async function createTerrainPhoto(
  supabase: Supabase,
  input: CreateTerrainPhotoInput
): Promise<TerrainPhoto> {
  const { data, error } = await supabase
    .from("terrain_photos")
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as TerrainPhoto
}

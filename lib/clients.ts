import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { Client, CreateClientInput } from "@/types"

type Supabase = SupabaseClient<Database>

export async function getClients(supabase: Supabase): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error
  return data
}

export async function getClient(
  supabase: Supabase,
  id: string
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createClient(
  supabase: Supabase,
  input: CreateClientInput
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

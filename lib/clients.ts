import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { Client, CreateClientInput, UpdateClientInput, ClientWithQuotes } from "@/types"

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

export async function getClientWithQuotes(
  supabase: Supabase,
  id: string
): Promise<ClientWithQuotes> {
  const { data, error } = await supabase
    .from("clients")
    .select(`
      *,
      projects (
        id,
        title,
        status,
        created_at,
        quotes (
          id,
          reference,
          status,
          total_ht,
          tva_rate,
          created_at,
          sent_at
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data as ClientWithQuotes
}

export async function createClient(
  supabase: Supabase,
  workspaceId: string,
  input: CreateClientInput
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, workspace_id: workspaceId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateClient(
  supabase: Supabase,
  id: string,
  input: UpdateClientInput
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClient(
  supabase: Supabase,
  id: string
): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id)
  if (error) throw error
}

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type {
  CalendarEventType,
  CreateCalendarEventTypeInput,
  UpdateCalendarEventTypeInput,
} from "@/types"

type Supabase = SupabaseClient<Database>

export const DEFAULT_EVENT_TYPES: CreateCalendarEventTypeInput[] = [
  { label: "Chantier / Travaux",     color: "#3b82f6" },
  { label: "Rendez-vous client",     color: "#ec4899" },
  { label: "Visite pré-chantier",    color: "#8b5cf6" },
  { label: "Livraison matériaux",    color: "#f97316" },
  { label: "Réunion d'équipe",       color: "#06b6d4" },
  { label: "Formation / Sécurité",   color: "#f59e0b" },
  { label: "Réception de chantier",  color: "#22c55e" },
  { label: "Permanence / Astreinte", color: "#6b7280" },
  { label: "Administratif",          color: "#a3a3a3" },
]

export async function getEventTypes(
  supabase: Supabase,
  workspaceId: string
): Promise<CalendarEventType[]> {
  // Tables not yet in generated types — migration pending
  const { data, error } = await (supabase as any)
    .from("calendar_event_types")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data as CalendarEventType[]
}

export async function createEventType(
  supabase: Supabase,
  workspaceId: string,
  input: CreateCalendarEventTypeInput
): Promise<CalendarEventType> {
  // Tables not yet in generated types — migration pending
  const { data, error } = await (supabase as any)
    .from("calendar_event_types")
    .insert({ workspace_id: workspaceId, ...input })
    .select()
    .single()
  if (error) throw error
  return data as CalendarEventType
}

export async function updateEventType(
  supabase: Supabase,
  id: string,
  input: UpdateCalendarEventTypeInput
): Promise<CalendarEventType> {
  // Tables not yet in generated types — migration pending
  const { data, error } = await (supabase as any)
    .from("calendar_event_types")
    .update(input)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as CalendarEventType
}

export async function deleteEventType(
  supabase: Supabase,
  id: string
): Promise<void> {
  // Tables not yet in generated types — migration pending
  const { data: usedBy } = await (supabase as any)
    .from("calendar_events")
    .select("id")
    .eq("event_type_id", id)
    .limit(1)
  if (usedBy && usedBy.length > 0) {
    throw new Error("Ce type est utilisé par des événements existants")
  }
  // Tables not yet in generated types — migration pending
  const { error } = await (supabase as any)
    .from("calendar_event_types")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function seedDefaultEventTypes(
  supabase: Supabase,
  workspaceId: string
): Promise<void> {
  const rows = DEFAULT_EVENT_TYPES.map((t) => ({
    workspace_id: workspaceId,
    label: t.label,
    color: t.color,
    is_preset: true,
  }))
  // Tables not yet in generated types — migration pending
  const { error } = await (supabase as any)
    .from("calendar_event_types")
    .insert(rows)
  if (error) throw error
}

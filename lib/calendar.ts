import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type {
  CalendarEvent,
  CalendarEventWithDetails,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/types"

type Supabase = SupabaseClient<Database>

export type GetEventsFilters = {
  from: string
  to: string
  assigneeId?: string
}

export async function getEvents(
  supabase: Supabase,
  workspaceId: string,
  filters: GetEventsFilters
): Promise<CalendarEventWithDetails[]> {
  // @ts-ignore
  const { data, error } = await supabase
    .from("calendar_events")
    .select(`
      *,
      event_type:calendar_event_types(*),
      assignees:calendar_event_assignees(user_id)
    `)
    .eq("workspace_id", workspaceId)
    .gte("start_at", filters.from)
    .lte("start_at", filters.to)
    .order("start_at", { ascending: true })

  if (error) throw error

  let events = data as unknown as CalendarEventWithDetails[]

  if (filters.assigneeId) {
    events = events.filter((e) =>
      e.assignees.some((a) => a.user_id === filters.assigneeId)
    )
  }

  return events
}

export async function getEvent(
  supabase: Supabase,
  id: string
): Promise<CalendarEventWithDetails> {
  // @ts-ignore
  const { data, error } = await supabase
    .from("calendar_events")
    .select(`
      *,
      event_type:calendar_event_types(*),
      assignees:calendar_event_assignees(user_id)
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data as unknown as CalendarEventWithDetails
}

export async function createEvent(
  supabase: Supabase,
  workspaceId: string,
  input: CreateCalendarEventInput
): Promise<CalendarEvent> {
  const { assignee_ids, ...rest } = input
  // @ts-ignore
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ workspace_id: workspaceId, ...rest })
    .select()
    .single()
  if (error) throw error

  if (assignee_ids && assignee_ids.length > 0) {
    // @ts-ignore
    const { error: assignError } = await supabase
      .from("calendar_event_assignees")
      .insert(assignee_ids.map((user_id) => ({ event_id: data.id, user_id })))
    if (assignError) throw assignError
  }

  return data as CalendarEvent
}

export async function updateEvent(
  supabase: Supabase,
  id: string,
  input: UpdateCalendarEventInput
): Promise<CalendarEventWithDetails> {
  const { assignee_ids, ...rest } = input

  if (Object.keys(rest).length > 0) {
    // @ts-ignore
    const { error } = await supabase
      .from("calendar_events")
      .update(rest)
      .eq("id", id)
    if (error) throw error
  }

  if (assignee_ids !== undefined) {
    // @ts-ignore
    await supabase
      .from("calendar_event_assignees")
      .delete()
      .eq("event_id", id)

    if (assignee_ids.length > 0) {
      // @ts-ignore
      const { error } = await supabase
        .from("calendar_event_assignees")
        .insert(assignee_ids.map((user_id) => ({ event_id: id, user_id })))
      if (error) throw error
    }
  }

  return getEvent(supabase, id)
}

export async function deleteEvent(
  supabase: Supabase,
  id: string
): Promise<void> {
  // @ts-ignore
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
  if (error) throw error
}

"use client"

import { useState, useCallback } from "react"
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays,
} from "date-fns"
import type { CalendarEventWithDetails, CalendarEventType, CalendarView } from "@/types"
import { CalendarHeader } from "./calendar-header"
import { CalendarFilters } from "./calendar-filters"
import { CalendarGrid } from "./calendar-grid"
import { EventDialog } from "./event-dialog"
import { useCalendarEvents } from "@/hooks/use-calendar-events"

interface WorkspaceUser { id: string; email: string; role: string | null }

interface CalendarClientProps {
  eventTypes: CalendarEventType[]
  workspaceUsers: WorkspaceUser[]
  canCreate?: boolean
  canFilter?: boolean
}

function getRange(view: CalendarView, date: Date): { from: string; to: string } {
  if (view === "month") {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
    return { from: start.toISOString(), to: end.toISOString() }
  }
  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return { from: start.toISOString(), to: end.toISOString() }
  }
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = addDays(start, 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

export function CalendarClient({
  eventTypes,
  workspaceUsers,
  canCreate = false,
  canFilter = false,
}: CalendarClientProps) {
  const [view, setView] = useState<CalendarView>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filterIds, setFilterIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDetails | null>(null)
  const [clickedDate, setClickedDate] = useState<Date | undefined>()

  const { from, to } = getRange(view, currentDate)

  const { events, refresh } = useCalendarEvents({ from, to })

  const filteredEvents = filterIds.length > 0
    ? events.filter((e) =>
        e.assignees.some((a) => filterIds.includes(a.user_id))
      )
    : events

  const handleEventClick = useCallback((event: CalendarEventWithDetails) => {
    setSelectedEvent(event)
    setDialogOpen(true)
  }, [])

  const handleDayClick = useCallback((date: Date) => {
    if (!canCreate) return
    setSelectedEvent(null)
    setClickedDate(date)
    setDialogOpen(true)
  }, [canCreate])

  const handleSave = async (data: {
    title: string
    description?: string | null
    start_at: string
    end_at: string
    event_type_id?: string | null
    assignee_ids: string[]
  }) => {
    const url = selectedEvent
      ? `/api/calendar/events/${selectedEvent.id}`
      : "/api/calendar/events"
    const method = selectedEvent ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Erreur lors de l'enregistrement")
    await refresh()
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    await fetch(`/api/calendar/events/${selectedEvent.id}`, { method: "DELETE" })
    await refresh()
  }

  return (
    <div className="space-y-4">
      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setCurrentDate}
        canCreate={canCreate}
        onNewEvent={() => {
          setSelectedEvent(null)
          setClickedDate(currentDate)
          setDialogOpen(true)
        }}
      />

      {canFilter && (
        <CalendarFilters
          users={workspaceUsers}
          selectedIds={filterIds}
          onToggle={(id) =>
            setFilterIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onClear={() => setFilterIds([])}
        />
      )}

      <CalendarGrid
        view={view}
        currentDate={currentDate}
        events={filteredEvents}
        onEventClick={handleEventClick}
        onDayClick={handleDayClick}
      />

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        defaultDate={clickedDate}
        eventTypes={eventTypes}
        workspaceUsers={workspaceUsers}
        onSave={handleSave}
        onDelete={selectedEvent ? handleDelete : undefined}
      />
    </div>
  )
}

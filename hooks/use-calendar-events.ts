"use client"

import { useState, useEffect, useCallback } from "react"
import type { CalendarEventWithDetails } from "@/types"

interface UseCalendarEventsOptions {
  from: string
  to: string
  assigneeId?: string
}

export function useCalendarEvents({ from, to, assigneeId }: UseCalendarEventsOptions) {
  const [events, setEvents] = useState<CalendarEventWithDetails[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (assigneeId) params.set("assigneeId", assigneeId)
      const res = await fetch(`/api/calendar/events?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setEvents(data)
    } finally {
      setLoading(false)
    }
  }, [from, to, assigneeId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, refresh: fetchEvents }
}

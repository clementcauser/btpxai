"use client"

import type { CalendarEventWithDetails } from "@/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface CalendarEventChipProps {
  event: CalendarEventWithDetails
  onClick: (event: CalendarEventWithDetails) => void
}

export function CalendarEventChip({ event, onClick }: CalendarEventChipProps) {
  const color = event.event_type?.color ?? "#6366f1"
  const time = format(new Date(event.start_at), "HH:mm", { locale: fr })

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(event)
      }}
      className="w-full text-left text-[11px] rounded-sm px-1.5 py-0.5 mb-0.5 leading-tight truncate font-medium transition-opacity hover:opacity-80"
      style={{
        backgroundColor: color + "22",
        color: color,
        borderLeft: `2px solid ${color}`,
      }}
      title={event.title}
    >
      <span className="opacity-70 mr-1">{time}</span>
      {event.title}
    </button>
  )
}

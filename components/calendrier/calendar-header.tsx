"use client"

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CalendarView } from "@/types"
import {
  format,
  addMonths, subMonths,
  addWeeks, subWeeks,
  addDays, subDays,
  startOfWeek, endOfWeek,
} from "date-fns"
import { fr } from "date-fns/locale"

interface CalendarHeaderProps {
  view: CalendarView
  currentDate: Date
  onViewChange: (view: CalendarView) => void
  onDateChange: (date: Date) => void
  onNewEvent?: () => void
  canCreate?: boolean
}

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mois" },
  { value: "week", label: "Semaine" },
  { value: "day", label: "Jour" },
]

function getTitle(view: CalendarView, date: Date): string {
  if (view === "month") return format(date, "MMMM yyyy", { locale: fr })
  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return `${format(start, "d MMM", { locale: fr })} — ${format(end, "d MMM yyyy", { locale: fr })}`
  }
  return format(date, "EEEE d MMMM yyyy", { locale: fr })
}

function navigate(view: CalendarView, date: Date, direction: -1 | 1): Date {
  if (view === "month") return direction === 1 ? addMonths(date, 1) : subMonths(date, 1)
  if (view === "week") return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1)
  return direction === 1 ? addDays(date, 1) : subDays(date, 1)
}

export function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
  onNewEvent,
  canCreate = false,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDateChange(navigate(view, currentDate, -1))}
          aria-label="Période précédente"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-[200px] text-center text-sm font-semibold capitalize text-foreground">
          {getTitle(view, currentDate)}
        </h2>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDateChange(navigate(view, currentDate, 1))}
          aria-label="Période suivante"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8"
          onClick={() => onDateChange(new Date())}
        >
          Aujourd'hui
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-border overflow-hidden">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => onViewChange(v.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {canCreate && onNewEvent && (
          <Button size="sm" className="h-8 gap-1.5" onClick={onNewEvent}>
            <CalendarDays className="size-3.5" />
            Nouvel événement
          </Button>
        )}
      </div>
    </div>
  )
}

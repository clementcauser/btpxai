"use client"

import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameMonth, isSameDay, isToday,
  format, getHours, getMinutes,
  addDays,
} from "date-fns"
import { fr } from "date-fns/locale"
import type { CalendarEventWithDetails, CalendarView } from "@/types"
import { CalendarEventChip } from "./calendar-event-chip"

const MAX_CHIPS_MONTH = 3
const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface CalendarGridProps {
  view: CalendarView
  currentDate: Date
  events: CalendarEventWithDetails[]
  onEventClick: (event: CalendarEventWithDetails) => void
  onDayClick: (date: Date) => void
}

function MonthView({ currentDate, events, onEventClick, onDayClick }: Omit<CalendarGridProps, "view">) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.start_at), day))
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(day)
          const overflow = dayEvents.length - MAX_CHIPS_MONTH
          const visibleEvents = dayEvents.slice(0, MAX_CHIPS_MONTH)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-1.5 border-r border-b border-border last:border-r-0 cursor-pointer transition-colors hover:bg-muted/30 ${
                !isCurrentMonth ? "opacity-40" : ""
              }`}
            >
              <div className="flex justify-end mb-1">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {visibleEvents.map((event) => (
                <CalendarEventChip
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                />
              ))}

              {overflow > 0 && (
                <p className="text-[10px] text-muted-foreground px-1 mt-0.5">
                  +{overflow} autre{overflow > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ currentDate, events, onEventClick, onDayClick }: Omit<CalendarGridProps, "view">) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.start_at), day))
  }

  function getTopPx(dateStr: string): number {
    const d = new Date(dateStr)
    return (getHours(d) * 60 + getMinutes(d)) * (56 / 60)
  }

  function getHeightPx(startStr: string, endStr: string): number {
    const mins = (new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000
    return Math.max(mins * (56 / 60), 20)
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border">
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`py-2 text-center cursor-pointer hover:bg-muted/30 ${isToday(day) ? "bg-primary/5" : ""}`}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {format(day, "EEE", { locale: fr })}
            </p>
            <p className={`text-sm font-semibold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[48px_repeat(7,1fr)] overflow-y-auto max-h-[600px]">
        <div>
          {HOURS.map((h) => (
            <div key={h} className="h-14 border-b border-border/50 flex items-start justify-end pr-2 pt-1">
              <span className="text-[10px] text-muted-foreground">{h.toString().padStart(2, "0")}h</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = eventsForDay(day)
          return (
            <div
              key={day.toISOString()}
              className="relative border-l border-border"
              style={{ height: `${24 * 56}px` }}
            >
              {HOURS.map((h) => (
                <div key={h} className="absolute w-full border-b border-border/30" style={{ top: `${h * 56}px`, height: "56px" }} />
              ))}

              {dayEvents.map((event) => {
                const top = getTopPx(event.start_at)
                const height = getHeightPx(event.start_at, event.end_at)
                const color = event.event_type?.color ?? "#6366f1"
                return (
                  <button
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                    className="absolute left-0.5 right-0.5 rounded-sm px-1 py-0.5 text-left overflow-hidden hover:opacity-80 transition-opacity"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: color + "22",
                      borderLeft: `2px solid ${color}`,
                      color,
                    }}
                  >
                    <p className="text-[10px] font-medium truncate leading-tight">{event.title}</p>
                    <p className="text-[9px] opacity-70">{format(new Date(event.start_at), "HH:mm")}</p>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({ currentDate, events, onEventClick }: Omit<CalendarGridProps, "view" | "onDayClick">) {
  const dayEvents = events.filter((e) => isSameDay(new Date(e.start_at), currentDate))

  function getTopPx(dateStr: string): number {
    const d = new Date(dateStr)
    return (getHours(d) * 60 + getMinutes(d)) * (56 / 60)
  }

  function getHeightPx(startStr: string, endStr: string): number {
    const mins = (new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000
    return Math.max(mins * (56 / 60), 20)
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="py-3 px-4 border-b border-border text-center">
        <p className="text-sm font-semibold capitalize">
          {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
        <p className="text-xs text-muted-foreground">{dayEvents.length} événement{dayEvents.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-[48px_1fr] overflow-y-auto max-h-[600px]">
        <div>
          {HOURS.map((h) => (
            <div key={h} className="h-14 border-b border-border/50 flex items-start justify-end pr-2 pt-1">
              <span className="text-[10px] text-muted-foreground">{h.toString().padStart(2, "0")}h</span>
            </div>
          ))}
        </div>

        <div className="relative border-l border-border" style={{ height: `${24 * 56}px` }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute w-full border-b border-border/30" style={{ top: `${h * 56}px`, height: "56px" }} />
          ))}
          {dayEvents.map((event) => {
            const color = event.event_type?.color ?? "#6366f1"
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="absolute left-1 right-1 rounded-sm px-2 py-1 text-left overflow-hidden hover:opacity-80 transition-opacity"
                style={{
                  top: `${getTopPx(event.start_at)}px`,
                  height: `${getHeightPx(event.start_at, event.end_at)}px`,
                  backgroundColor: color + "22",
                  borderLeft: `3px solid ${color}`,
                  color,
                }}
              >
                <p className="text-xs font-semibold truncate">{event.title}</p>
                <p className="text-[10px] opacity-70">
                  {format(new Date(event.start_at), "HH:mm")} → {format(new Date(event.end_at), "HH:mm")}
                </p>
                {event.description && (
                  <p className="text-[10px] opacity-60 truncate mt-0.5">{event.description}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CalendarGrid(props: CalendarGridProps) {
  if (props.view === "month") return <MonthView {...props} />
  if (props.view === "week") return <WeekView {...props} />
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onDayClick: _onDayClick, view: _view, ...dayProps } = props
  return <DayView {...dayProps} />
}

import type { CalendarEventType } from "@/types"

export function EventTypeBadge({ type }: { type: CalendarEventType | null }) {
  if (!type) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-sm"
      style={{
        backgroundColor: type.color + "22",
        color: type.color,
        border: `1px solid ${type.color}44`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: type.color }}
      />
      {type.label}
    </span>
  )
}

"use client"

interface WorkspaceUser {
  id: string
  email: string
  role: string | null
}

interface CalendarFiltersProps {
  users: WorkspaceUser[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onClear: () => void
}

export function CalendarFilters({
  users,
  selectedIds,
  onToggle,
  onClear,
}: CalendarFiltersProps) {
  const ouvriers = users.filter((u) => u.role === "ouvrier")
  if (ouvriers.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground shrink-0">Filtrer :</span>
      <button
        onClick={onClear}
        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
          selectedIds.length === 0
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:border-primary/50"
        }`}
      >
        Tous
      </button>
      {ouvriers.map((u) => {
        const selected = selectedIds.includes(u.id)
        return (
          <button
            key={u.id}
            onClick={() => onToggle(u.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {u.email.split("@")[0]}
          </button>
        )
      })}
    </div>
  )
}

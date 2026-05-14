import { Skeleton } from "@/components/ui/skeleton"

export default function MateriauxLoading() {
  return (
    <div className="p-4 space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-20 h-8" />
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="rounded-sm border border-border bg-card p-4 space-y-3">
            <Skeleton className="w-36 h-5" />
            {Array.from({ length: 3 }).map((_, card) => (
              <div key={card} className="rounded-sm border border-border bg-muted/10 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-16 h-5 shrink-0" />
                </div>
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-24 h-3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

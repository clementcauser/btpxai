import { Skeleton } from "@/components/ui/skeleton"

export default function AlertesLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-3.5" />
            <Skeleton className="w-28 h-2" />
          </div>
          <Skeleton className="w-48 h-9" />
          <Skeleton className="w-72 h-3 mt-1" />
        </div>
        <Skeleton className="w-28 h-9 shrink-0" />
      </div>

      {/* Alerte cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="w-48 h-4" />
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-32 h-3" />
              </div>
              <Skeleton className="w-24 h-6 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

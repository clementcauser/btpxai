import { Skeleton } from "@/components/ui/skeleton"

export default function CalendrierLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-3.5" />
            <Skeleton className="w-24 h-2" />
          </div>
          <Skeleton className="w-44 h-9" />
          <Skeleton className="w-72 h-3 mt-1" />
        </div>
      </div>

      {/* Calendar widget */}
      <div className="rounded-sm border border-border bg-card">
        {/* Calendar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-32 h-5" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="w-16 h-7" />
            <Skeleton className="w-16 h-7" />
            <Skeleton className="w-16 h-7" />
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-2 py-2 text-center">
              <Skeleton className="w-6 h-3 mx-auto" />
            </div>
          ))}
        </div>

        {/* Day cells — 5 weeks */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7">
            {Array.from({ length: 7 }).map((_, day) => (
              <div
                key={day}
                className="min-h-[80px] border-r border-b border-border/40 p-1.5 last:border-r-0"
              >
                <Skeleton className="w-5 h-4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

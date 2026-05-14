import { Skeleton } from "@/components/ui/skeleton"

export default function InboxLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-3.5" />
          <Skeleton className="w-28 h-2" />
        </div>
        <Skeleton className="w-44 h-9" />
        <Skeleton className="w-56 h-3 mt-1" />
      </div>

      {/* Email list */}
      <div className="rounded-sm border border-border overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
            <Skeleton className="size-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="w-32 h-3" />
              <Skeleton className="w-64 h-3" />
            </div>
            <Skeleton className="w-16 h-3 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

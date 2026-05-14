import { Skeleton } from "@/components/ui/skeleton"

export default function DevisNouveauLoading() {
  return (
    <div className="space-y-8">
      {/* Header with breadcrumb */}
      <div>
        <Skeleton className="w-32 h-7 -ml-2 mb-3" />
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-3.5" />
          <Skeleton className="w-16 h-2" />
        </div>
        <Skeleton className="w-52 h-9" />
        <Skeleton className="w-72 h-3 mt-1" />
      </div>

      {/* Form card */}
      <div className="rounded-sm border border-border bg-card p-6 space-y-6">
        <Skeleton className="w-40 h-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-full h-9" />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Skeleton className="w-28 h-3" />
          <Skeleton className="w-full h-24" />
        </div>
        <Skeleton className="w-full h-9" />
      </div>
    </div>
  )
}

import { SkeletonPageHeader } from "@/components/skeletons/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ParametresLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />

      {/* Tabs bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-32 h-9" />
        ))}
      </div>

      {/* Tab panel */}
      <div className="rounded-sm border border-border bg-card p-6 space-y-6">
        <Skeleton className="w-40 h-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-full h-9" />
            </div>
          ))}
        </div>
        <Skeleton className="w-32 h-9" />
      </div>
    </div>
  )
}

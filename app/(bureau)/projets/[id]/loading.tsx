import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonSectionCard } from "@/components/skeletons/page-skeletons"

export default function ProjetDetailLoading() {
  return (
    <div className="space-y-8">
      {/* Back link */}
      <Skeleton className="w-36 h-7 -ml-2" />

      {/* Project header card */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <div className="h-1 w-full bg-muted" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-5 flex-wrap">
            <Skeleton className="size-16 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-20 h-5" />
              </div>
              <Skeleton className="w-72 h-10 mb-3" />
              <div className="flex flex-wrap gap-4">
                <Skeleton className="w-28 h-3" />
                <Skeleton className="w-36 h-3" />
                <Skeleton className="w-32 h-3" />
              </div>
            </div>
            <Skeleton className="w-8 h-8" />
          </div>

          {/* Stats */}
          <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="w-16 h-2 mb-1" />
                <Skeleton className="w-20 h-8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Members */}
      <SkeletonSectionCard withAction>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-6 rounded-full" />
          ))}
        </div>
      </SkeletonSectionCard>

      {/* Devis table */}
      <SkeletonSectionCard>
        <div className="rounded-sm border border-border overflow-hidden">
          <div className="flex gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
            <Skeleton className="w-24 h-3" />
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-20 h-3 ml-auto" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/50 last:border-0">
              <Skeleton className="w-24 h-3.5" />
              <Skeleton className="w-20 h-3.5" />
              <Skeleton className="w-20 h-5" />
              <Skeleton className="w-20 h-3.5 ml-auto" />
            </div>
          ))}
        </div>
      </SkeletonSectionCard>

      {/* Tasks */}
      <SkeletonSectionCard withAction>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-sm border border-border">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="flex-1 h-4" />
              <Skeleton className="w-20 h-4" />
            </div>
          ))}
        </div>
      </SkeletonSectionCard>

      {/* Project Steps */}
      <SkeletonSectionCard>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-5 shrink-0" />
              <Skeleton className="flex-1 h-4" />
              <Skeleton className="w-16 h-3" />
            </div>
          ))}
        </div>
      </SkeletonSectionCard>
    </div>
  )
}

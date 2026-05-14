import { SkeletonPageHeader, SkeletonDataTable } from "@/components/skeletons/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function DevisLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SkeletonPageHeader />
        <Skeleton className="w-36 h-9 shrink-0" />
      </div>
      <SkeletonDataTable rows={8} cols={5} />
    </div>
  )
}

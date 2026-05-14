import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonDataTable } from "@/components/skeletons/page-skeletons"

export default function WorkspacesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-3.5" />
          <Skeleton className="w-24 h-2" />
        </div>
        <Skeleton className="w-56 h-9" />
        <Skeleton className="w-48 h-3 mt-1" />
      </div>
      <SkeletonDataTable rows={8} cols={5} />
    </div>
  )
}

import { SkeletonPageHeader, SkeletonDataTable } from "@/components/skeletons/page-skeletons"

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonDataTable rows={8} cols={5} />
    </div>
  )
}

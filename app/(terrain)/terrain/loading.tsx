import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonTerrainHeader } from "@/components/skeletons/page-skeletons"

export default function TerrainLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SkeletonTerrainHeader />

      <main className="flex-1 px-4 py-4 space-y-3 pb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-stretch bg-card border border-border rounded-sm overflow-hidden">
            <Skeleton className="w-1 shrink-0 rounded-none" />
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Skeleton className="w-48 h-6" />
                  <Skeleton className="w-32 h-3.5 mt-1" />
                </div>
                <Skeleton className="w-20 h-7 shrink-0" />
              </div>
              <Skeleton className="w-full h-3 mt-2" />
              <Skeleton className="w-16 h-3 mt-3" />
            </div>
          </div>
        ))}
      </main>

      <footer className="px-4 pb-4 pt-3 border-t border-border space-y-3">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-40 h-3 mx-auto" />
      </footer>
    </div>
  )
}

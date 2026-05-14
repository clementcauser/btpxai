import { Skeleton } from "@/components/ui/skeleton"

export default function TerrainProjectLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4">
        <div className="flex items-center gap-3 py-3">
          <Skeleton className="size-6 shrink-0" />
          <Skeleton className="flex-1 h-8" />
          <Skeleton className="size-3 rounded-full shrink-0" />
        </div>

        {/* Tab triggers */}
        <div className="flex gap-1 pb-0 -mb-px overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-14 h-9 shrink-0" />
          ))}
        </div>
      </header>

      {/* Tab content — notes tab */}
      <main className="flex-1 p-4 space-y-3">
        {/* Voice recorder area */}
        <Skeleton className="w-full h-20" />

        {/* Note items */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-border p-3 space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-4/5 h-3" />
            <Skeleton className="w-24 h-2" />
          </div>
        ))}
      </main>
    </div>
  )
}

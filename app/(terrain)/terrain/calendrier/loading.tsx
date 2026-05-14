import { Skeleton } from "@/components/ui/skeleton"

export default function TerrainCalendrierLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4">
        <div className="flex items-center gap-3 py-4">
          <Skeleton className="size-5 shrink-0" />
          <div>
            <Skeleton className="w-24 h-2 mb-1.5" />
            <Skeleton className="w-32 h-8" />
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Calendar widget */}
        <div className="rounded-sm border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="w-8 h-8" />
              <Skeleton className="w-32 h-5" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="w-16 h-7" />
              <Skeleton className="w-16 h-7" />
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-2 py-2 text-center">
                <Skeleton className="w-6 h-3 mx-auto" />
              </div>
            ))}
          </div>

          {Array.from({ length: 5 }).map((_, week) => (
            <div key={week} className="grid grid-cols-7">
              {Array.from({ length: 7 }).map((_, day) => (
                <div
                  key={day}
                  className="min-h-[70px] border-r border-b border-border/40 p-1.5 last:border-r-0"
                >
                  <Skeleton className="w-5 h-4" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

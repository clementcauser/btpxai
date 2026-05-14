import { Skeleton } from "@/components/ui/skeleton"

export default function ClientDetailLoading() {
  return (
    <div className="space-y-8">
      {/* Back link */}
      <Skeleton className="w-36 h-7 -ml-2" />

      {/* Client header card */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <div className="h-1 w-full bg-muted/40" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-6 flex-wrap">
            <Skeleton className="size-20 shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="w-20 h-3 mb-1" />
              <Skeleton className="w-64 h-10 mb-3" />
              <div className="flex flex-wrap gap-4">
                <Skeleton className="w-40 h-3" />
                <Skeleton className="w-28 h-3" />
                <Skeleton className="w-36 h-3" />
                <Skeleton className="w-44 h-3" />
              </div>
            </div>
            <Skeleton className="w-24 h-8" />
          </div>

          {/* Stats */}
          <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="w-14 h-2 mb-1" />
                <Skeleton className="w-16 h-8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects & Quotes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5" />
          <Skeleton className="w-32 h-3" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, p) => (
            <div key={p} className="rounded-sm border border-border bg-card overflow-hidden">
              {/* Project header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-secondary/20">
                <Skeleton className="size-3.5 shrink-0" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-20 h-3" />
              </div>

              {/* Quotes table */}
              <div>
                <div className="flex gap-4 px-4 py-2.5 border-b border-border/40">
                  <Skeleton className="w-24 h-3" />
                  <Skeleton className="w-20 h-3 hidden sm:block" />
                  <Skeleton className="w-20 h-3" />
                  <Skeleton className="w-24 h-3 ml-auto" />
                </div>
                {Array.from({ length: 2 }).map((_, q) => (
                  <div key={q} className="flex gap-4 px-4 py-3 border-b border-border/30 last:border-0">
                    <Skeleton className="w-24 h-3.5" />
                    <Skeleton className="w-20 h-3.5 hidden sm:block" />
                    <Skeleton className="w-20 h-5" />
                    <Skeleton className="w-24 h-3.5 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="size-3" />
          <Skeleton className="w-40 h-2" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Skeleton className="w-48 h-10" />
            <Skeleton className="w-56 h-3 mt-1.5" />
          </div>
          <Skeleton className="w-24 h-6 shrink-0" />
        </div>
        <div className="mt-4 h-px bg-border" />
      </header>

      {/* Metric cards */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-24 h-2" />
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-border bg-card p-5 h-[140px] flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="w-24 h-2" />
                <Skeleton className="size-7 shrink-0" />
              </div>
              <Skeleton className="w-16 h-9" />
              <Skeleton className="w-32 h-3" />
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-28 h-2" />
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-border bg-card p-4 flex items-start gap-3">
              <Skeleton className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-40 h-3 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

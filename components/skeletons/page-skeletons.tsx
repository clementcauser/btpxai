import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Page header: icon chip + label + h1 + description
export function SkeletonPageHeader({
  withButton = false,
  withBreadcrumb = false,
}: {
  withButton?: boolean
  withBreadcrumb?: boolean
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", withBreadcrumb && "flex-col gap-2")}>
      <div className={cn("space-y-1", withBreadcrumb && "w-full")}>
        {withBreadcrumb && <Skeleton className="w-32 h-7 mb-2" />}
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-3.5" />
          <Skeleton className="w-20 h-2" />
        </div>
        <Skeleton className="w-48 h-9" />
        <Skeleton className="w-64 h-3 mt-1" />
      </div>
      {withButton && <Skeleton className="w-32 h-9 shrink-0" />}
    </div>
  )
}

// Data table: thead + N skeleton rows
export function SkeletonDataTable({
  rows = 8,
  cols = 5,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="rounded-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3", i === 0 ? "w-32" : i === cols - 1 ? "w-16 ml-auto" : "w-24")}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0"
        >
          <Skeleton className="w-32 h-3.5" />
          {Array.from({ length: cols - 2 }).map((_, j) => (
            <Skeleton key={j} className="w-24 h-3.5" />
          ))}
          <Skeleton className="w-16 h-3.5 ml-auto" />
        </div>
      ))}
    </div>
  )
}

// Section card: border bg-card p-6 with header + body
export function SkeletonSectionCard({
  children,
  withAction = false,
}: {
  children: React.ReactNode
  withAction?: boolean
}) {
  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-6 h-3" />
        </div>
        {withAction && <Skeleton className="w-24 h-8" />}
      </div>
      {children}
    </section>
  )
}

// Terrain sticky header
export function SkeletonTerrainHeader() {
  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border px-4">
      <div className="flex items-start justify-between py-4">
        <div>
          <Skeleton className="w-40 h-2 mb-1.5" />
          <Skeleton className="w-44 h-9" />
        </div>
        <div className="text-right pt-1 space-y-1">
          <Skeleton className="w-28 h-2.5" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
    </header>
  )
}

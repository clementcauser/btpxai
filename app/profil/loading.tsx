import { Skeleton } from "@/components/ui/skeleton"

export default function ProfilLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-8">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-3.5" />
            <Skeleton className="w-16 h-2" />
          </div>
          <Skeleton className="w-40 h-9" />
          <div className="mt-4 h-px bg-border" />
        </header>

        {/* Profile card */}
        <div className="rounded-sm border border-border bg-card p-5 max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="w-12 h-2" />
            <Skeleton className="w-48 h-4" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="w-8 h-2" />
            <Skeleton className="w-20 h-5" />
          </div>
        </div>

        {/* Theme card */}
        <div className="rounded-sm border border-border bg-card p-5 max-w-sm">
          <Skeleton className="w-32 h-4 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="w-20 h-8" />
            <Skeleton className="w-20 h-8" />
            <Skeleton className="w-20 h-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function DevisPreviewLoading() {
  return (
    <div className="space-y-8">
      {/* Header with breadcrumb */}
      <div>
        <Skeleton className="w-32 h-7 -ml-2 mb-3" />
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-3.5" />
          <Skeleton className="w-16 h-2" />
        </div>
        <Skeleton className="w-48 h-9" />
        <Skeleton className="w-64 h-3 mt-1" />
      </div>

      {/* Editor layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel — quote items */}
        <div className="lg:col-span-2 rounded-sm border border-border bg-card p-6 space-y-4">
          <Skeleton className="w-32 h-5" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="flex-1 h-8" />
                <Skeleton className="w-16 h-8" />
                <Skeleton className="w-20 h-8" />
                <Skeleton className="w-8 h-8" />
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <div className="space-y-2 text-right">
              <Skeleton className="w-40 h-4 ml-auto" />
              <Skeleton className="w-32 h-4 ml-auto" />
              <Skeleton className="w-48 h-6 ml-auto" />
            </div>
          </div>
        </div>

        {/* Right panel — actions */}
        <div className="rounded-sm border border-border bg-card p-6 space-y-4">
          <Skeleton className="w-28 h-5" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-full h-9" />
            </div>
          ))}
          <Skeleton className="w-full h-9 mt-4" />
          <Skeleton className="w-full h-9" />
        </div>
      </div>
    </div>
  )
}

export function PageLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse" aria-label="Loading content" role="status">
      <div className="h-9 w-52 rounded-lg bg-navy-100/70" />
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex gap-4 border-b border-navy-800/5 pb-4">
              <div className="h-28 w-24 shrink-0 rounded-lg bg-navy-100/70" />
              <div className="flex-1 space-y-3 py-2">
                <div className="h-4 w-2/3 rounded bg-navy-100/70" />
                <div className="h-3 w-1/3 rounded bg-navy-100/50" />
                <div className="h-9 w-28 rounded-full bg-navy-100/60" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 rounded-lg bg-navy-100/50" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function ListLoadingSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading items" role="status">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="flex gap-4 rounded-lg border border-navy-800/5 bg-white p-4">
          <div className="h-24 w-20 shrink-0 rounded-lg bg-navy-100/70" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 w-4/5 rounded bg-navy-100/70" />
            <div className="h-3 w-2/5 rounded bg-navy-100/50" />
            <div className="h-8 w-28 rounded-full bg-navy-100/60" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

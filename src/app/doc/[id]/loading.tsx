export default function Loading() {
  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-3">
          <span className="text-sm text-muted">← Dashboard</span>
          <span className="text-muted text-sm">·</span>
          <span className="text-sm text-muted inline-flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
            Loading…
          </span>
          <div className="flex-1" />
          <span className="hidden sm:inline-block h-4 w-16 bg-surface rounded animate-pulse" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-8 flex-1">
        <div className="h-9 w-2/3 bg-surface rounded animate-pulse mb-6" />
        <div className="flex gap-1 mb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-9 bg-surface rounded animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-surface rounded animate-pulse" />
          <div className="h-4 w-11/12 bg-surface rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-surface rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-surface rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-surface rounded animate-pulse" />
        </div>
      </main>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Collab Docs</h1>
          <div className="h-4 w-40 bg-surface rounded animate-pulse" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 flex-1">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="h-9 w-56 bg-surface rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-36 bg-surface rounded animate-pulse" />
            <div className="h-9 w-36 bg-surface rounded animate-pulse" />
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-background">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div
                  className="h-4 bg-surface rounded animate-pulse"
                  style={{ width: `${60 - i * 8}%`, animationDelay: `${i * 80}ms` }}
                />
                <div
                  className="h-3 w-1/3 bg-surface rounded animate-pulse"
                  style={{ animationDelay: `${i * 80 + 40}ms` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-sm">
        <div className="h-7 w-32 bg-surface rounded animate-pulse mb-2" />
        <div className="h-3 w-3/4 bg-surface rounded animate-pulse mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-surface rounded-md animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-9 w-full bg-surface rounded-md animate-pulse mt-4" />
      </div>
    </main>
  );
}

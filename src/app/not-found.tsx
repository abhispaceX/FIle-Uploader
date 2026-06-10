import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-2">Not found</h1>
        <p className="text-muted mb-6 text-sm">
          The document doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

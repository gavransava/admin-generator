export function BundleError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg space-y-3 border border-red-200 bg-red-50 rounded p-6">
        <h1 className="text-xl font-semibold text-red-900">Invalid admin config</h1>
        <p className="text-red-800 whitespace-pre-wrap">{message}</p>
        <a
          href="/studio"
          className="inline-block px-3 py-1.5 rounded bg-primary-600 text-white text-sm"
        >
          Regenerate in Studio
        </a>
      </div>
    </div>
  );
}

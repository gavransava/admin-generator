export function EmptyState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">No admin config found</h1>
        <p className="text-gray-600">
          Open the Studio at <code className="bg-beige-100 px-1.5 rounded">/studio</code>{" "}
          to create one.
        </p>
        <a
          href="/studio"
          className="inline-block px-4 py-2 rounded bg-primary-600 text-white"
        >
          Open Studio
        </a>
      </div>
    </div>
  );
}

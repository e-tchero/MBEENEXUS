export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-embee-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-embee-blue border-t-transparent" />
        <p className="text-sm text-embee-slate">Loading...</p>
      </div>
    </div>
  );
}

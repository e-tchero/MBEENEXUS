import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-embee-white">
      <h2 className="text-6xl font-extrabold text-embee-charcoal">404</h2>
      <p className="text-xl text-embee-slate">Page not found</p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-2 bg-embee-blue text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-embee-blue/90 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}

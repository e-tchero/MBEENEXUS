import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-embee-white px-4">
      <div className="text-center">
        <h1 className="text-7xl font-extrabold text-embee-blue/20">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-embee-charcoal">Page not found</h2>
        <p className="mt-2 text-embee-slate max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-embee-blue text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-embee-blue/90 transition-colors shadow-sm touch-target"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Go home
      </Link>
    </div>
  );
}

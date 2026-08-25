import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

/* ─────────────────────────────────────────────
   SVG Icons (inline, lightweight, no deps)
   ───────────────────────────────────────────── */

function IconPackage({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function IconMapPin({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function IconCheck({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconShield({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconBolt({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function IconCreditCard({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function IconDocumentCheck({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconStar({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function IconArrowRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */

const howItWorks = [
  {
    step: '01',
    title: 'Book',
    description: 'Enter your pickup and destination details. Get an instant quote and confirm your delivery.',
    icon: IconPackage,
  },
  {
    step: '02',
    title: 'Track',
    description: 'Follow your delivery in real time. Watch your rider approach on the map from pickup to drop-off.',
    icon: IconMapPin,
  },
  {
    step: '03',
    title: 'Receive',
    description: 'Get your package delivered safely. Confirm receipt and complete the transaction.',
    icon: IconCheck,
  },
];

const features = [
  {
    title: 'Instant Quotes',
    description: 'Get transparent, upfront pricing before you book. No hidden fees.',
    icon: IconBolt,
  },
  {
    title: 'Real-Time Tracking',
    description: 'Follow every step of your delivery with live map tracking and status updates.',
    icon: IconMapPin,
  },
  {
    title: 'Secure Payments',
    description: 'Pay safely with card, bank transfer, or USSD through Paystack.',
    icon: IconCreditCard,
  },
  {
    title: 'Delivery Proof',
    description: 'Every delivery is confirmed with proof — recipient name and photo evidence.',
    icon: IconDocumentCheck,
  },
  {
    title: 'Verified Riders',
    description: 'All riders are verified through document review before they can accept deliveries.',
    icon: IconShield,
  },
  {
    title: 'Order History',
    description: 'Access your complete delivery history, cancellations, refunds, and ratings.',
    icon: IconStar,
  },
];

const riderBenefits = [
  'Accept deliveries on your schedule',
  'Real-time offer notifications',
  'Step-by-step delivery guidance',
  'Transparent earnings visibility',
  'Secure and verified platform',
];

/* ─────────────────────────────────────────────
   Page
   ───────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo variant="wordmark" size="sm" theme="light" href="/" />

            <nav className="hidden sm:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium text-embee-slate hover:text-embee-charcoal transition-colors">
                How It Works
              </a>
              <a href="#features" className="text-sm font-medium text-embee-slate hover:text-embee-charcoal transition-colors">
                Features
              </a>
              <a href="#riders" className="text-sm font-medium text-embee-slate hover:text-embee-charcoal transition-colors">
                Riders
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-embee-charcoal hover:text-embee-blue transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-embee-blue text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-embee-blue/90 transition-colors"
              >
                Get Started
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-embee-navy">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-embee-blue/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-embee-cyan/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-embee-cyan animate-pulse" />
              <span className="text-sm font-medium text-embee-cyan">Modern Logistics Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              You want it delivered.{' '}
              <span className="text-embee-cyan">Embee Nexus</span>{' '}
              is the right platform for the job.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl leading-relaxed">
              Book deliveries with instant quotes. Track your package in real time.
              Pay securely. Get proof of delivery — all on one modern platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-embee-blue text-white text-base font-semibold px-8 py-3.5 rounded-lg hover:bg-embee-blue/90 transition-colors shadow-lg shadow-embee-blue/25"
              >
                Send a Package
                <IconArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/rider/register"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-base font-semibold px-8 py-3.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                Become a Rider
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-embee-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-embee-blue uppercase tracking-wider">How It Works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-embee-charcoal tracking-tight">
              Three simple steps
            </h2>
            <p className="mt-4 text-lg text-embee-slate">
              From booking to delivery confirmation — fast, transparent, and reliable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-embee-blue/10 text-embee-blue">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-bold text-embee-blue/40">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-embee-charcoal mb-2">{item.title}</h3>
                <p className="text-embee-slate leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-embee-blue uppercase tracking-wider">Features</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-embee-charcoal tracking-tight">
              Built for reliability
            </h2>
            <p className="mt-4 text-lg text-embee-slate">
              Every feature is designed to make your delivery experience seamless and trustworthy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-embee-blue/20 hover:shadow-lg hover:shadow-embee-blue/5 transition-all duration-200"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-embee-blue/10 text-embee-blue mb-4 group-hover:bg-embee-blue group-hover:text-white transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-embee-charcoal mb-2">{feature.title}</h3>
                <p className="text-sm text-embee-slate leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR RIDERS ── */}
      <section id="riders" className="bg-embee-navy py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-sm font-semibold text-embee-cyan uppercase tracking-wider">For Riders</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Earn on your schedule
              </h2>
              <p className="mt-4 text-lg text-gray-300 leading-relaxed">
                Join the Embee Nexus rider network. Accept deliveries when you want, track your earnings, and grow with a verified platform.
              </p>

              <ul className="mt-8 space-y-3">
                {riderBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-embee-cyan/20">
                      <IconCheck className="h-3 w-3 text-embee-cyan" />
                    </div>
                    <span className="text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Link
                  href="/rider/register"
                  className="inline-flex items-center gap-2 bg-embee-cyan text-embee-navy text-base font-semibold px-8 py-3.5 rounded-lg hover:bg-embee-cyan/90 transition-colors"
                >
                  Become a Rider
                  <IconArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Decorative card */}
            <div className="hidden lg:block">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-embee-cyan/20 flex items-center justify-center">
                    <IconPackage className="h-5 w-5 text-embee-cyan" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Active Delivery</p>
                    <p className="text-sm text-gray-400">Pickup → Destination</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {['Accepted by rider', 'Rider heading to pickup', 'Package picked up', 'Heading to destination', 'Delivered'].map(
                    (step, i) => (
                      <div key={step} className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            i < 3 ? 'bg-embee-cyan' : i === 3 ? 'bg-embee-blue animate-pulse' : 'bg-gray-600'
                          }`}
                        />
                        <span className={`text-sm ${i < 4 ? 'text-gray-300' : 'text-gray-500'}`}>{step}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="bg-embee-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-embee-blue uppercase tracking-wider">Why Embee Nexus</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-embee-charcoal tracking-tight">
              Trusted from dispatch to delivery
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: IconShield,
                title: 'Verified Riders',
                description: 'Every rider is verified through document review before accepting deliveries.',
              },
              {
                icon: IconCreditCard,
                title: 'Secure Payments',
                description: 'Paystack-powered payments with card, bank transfer, and USSD support.',
              },
              {
                icon: IconMapPin,
                title: 'Live Tracking',
                description: 'Real-time map tracking from pickup to destination with status updates.',
              },
              {
                icon: IconDocumentCheck,
                title: 'Delivery Proof',
                description: 'Every delivery includes recipient confirmation and photo evidence.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-embee-blue/10 text-embee-blue mx-auto mb-4">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-embee-charcoal mb-2">{item.title}</h3>
                <p className="text-sm text-embee-slate leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-embee-charcoal tracking-tight">
            Ready to send a package?
          </h2>
          <p className="mt-4 text-lg text-embee-slate max-w-xl mx-auto">
            Create your account in seconds. Get an instant quote. Track every step.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-embee-blue text-white text-base font-semibold px-8 py-3.5 rounded-lg hover:bg-embee-blue/90 transition-colors shadow-lg shadow-embee-blue/25"
            >
              Get Started Free
              <IconArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-embee-charcoal text-base font-semibold px-8 py-3.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-embee-navy border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo variant="wordmark" size="sm" theme="dark" href="/" />
              <p className="mt-4 text-sm text-gray-400 max-w-xs leading-relaxed">
                You want it delivered. Embee Nexus is the right platform for the job.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/signup" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Send a Package
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Riders */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Riders</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/rider/register" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Become a Rider
                  </Link>
                </li>
                <li>
                  <Link href="/rider/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Rider Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <span className="text-sm text-gray-400">Embee Nexus</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Embee Nexus. All rights reserved.
            </p>
            <p className="text-xs text-gray-600">
              Modern logistics platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

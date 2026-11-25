import { Zap, MapPin, Star, Globe, PhoneMissed, ArrowRight, CheckCircle2 } from 'lucide-react'

const PLANS = [
  { id: 'missed_call', name: 'Missed-call text-back', price: '$197', per: '/mo', setup: 'No setup fee',
    pitch: 'Every missed call gets an instant text back, so the caller books with you instead of the next number on Google.',
    points: ['Replies in seconds, 24/7', 'Works with your current number', 'Live in 48 hours'] },
  { id: 'review_growth', name: 'Review growth', price: '$197', per: '/mo', setup: 'No setup fee', featured: true,
    pitch: 'Automatic review requests after every job, so you climb past competitors with more 5-star reviews.',
    points: ['Text + email review requests', 'Catches unhappy customers privately first', 'Monthly review report'] },
  { id: 'site_build', name: 'Website + monthly care', price: '$497', per: ' setup', setup: 'then $49/mo',
    pitch: 'A fast, mobile-first website built in 7 days, with a big tap-to-call button and hosting included.',
    points: ['Built in 7 days', 'Hosting, updates and fixes', 'Made to turn visitors into calls'] },
  { id: 'local_seo', name: 'Google profile & local SEO', price: '$497', per: '/mo', setup: 'No setup fee',
    pitch: 'We manage your Google Business Profile and local SEO every month to keep you at the top of the map.',
    points: ['Weekly posts and photos', 'Profile and citation clean-up', 'Monthly ranking report'] },
]

const LEAKS = [
  { icon: MapPin, title: 'Google Maps', text: "If you're not in the top 3 when someone nearby searches, most callers never see you." },
  { icon: Star, title: 'Reviews', text: 'Fewer reviews than the shop down the road, and customers pick them first.' },
  { icon: Globe, title: 'Website', text: 'No site, or one that is slow on a phone, and people call whoever looks more legit.' },
  { icon: PhoneMissed, title: 'Missed calls', text: "When you're on a job and can't pick up, most callers don't leave a voicemail. They call the next guy." },
]

const FAQ = [
  ['Is the audit really free?', 'Yes. No card, no contract. It pulls your real Google Maps data, compares you to local competitors and shows your top 3 fixes in about 30 seconds.'],
  ['Who is this for?', 'Plumbers, HVAC, electricians, roofers and other local home-service businesses that want more calls and booked jobs.'],
  ['Do I have to sign a long contract?', 'No. Monthly plans can be cancelled any time. Setup fees are one-time.'],
  ['How fast does it work?', 'Missed-call text-back is usually live within 48 hours. Websites take about 7 days. Reviews and map rankings build month over month.'],
]

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2 text-white font-bold text-lg">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></span>
          AImHighAI
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/guides/plumbers-missed-calls" className="hidden sm:inline text-slate-400 hover:text-white">Guide</a>
          <a href="/missed-call-calculator" className="hidden sm:inline text-slate-400 hover:text-white">Calculator</a>
          <a href="#plans" className="hidden sm:inline text-slate-400 hover:text-white">Plans</a>
          <a href="/login" className="text-slate-300 hover:text-white">Sign in</a>
          <a href="/free-audit" className="rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2">Free audit</a>
        </nav>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <p className="inline-block rounded-full border border-amber-700 bg-amber-950/60 text-amber-300 text-sm font-semibold px-3 py-1">For plumbers, HVAC &amp; home-service businesses</p>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Stop losing jobs to the business that <span className="text-teal-400">answers first.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
            AImHighAI finds where your business leaks calls on Google Maps, reviews, your website and missed calls, then fixes it on autopilot.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/free-audit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-lg px-7 py-4">
              Get my free Lead Leak Audit <ArrowRight className="w-5 h-5" />
            </a>
            <a href="/missed-call-calculator" className="inline-flex items-center justify-center rounded-xl border border-slate-700 hover:border-slate-500 text-white font-semibold text-lg px-7 py-4">
              What are missed calls costing me?
            </a>
          </div>
          <p className="mt-3 text-sm text-slate-500">Normally $497 · free this month · results in about 30 seconds</p>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-bold text-white text-center">The 4 places local businesses leak jobs</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEAKS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <Icon className="w-7 h-7 text-teal-400" />
                <h3 className="mt-3 font-semibold text-white text-lg">{title}</h3>
                <p className="mt-2 text-slate-400 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-slate-400">
            Our free audit checks all four using your real Google data. <a href="/free-audit" className="text-teal-400 font-semibold">Run yours now →</a>
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-bold text-white text-center">How it works</h2>
          <ol className="mt-8 grid sm:grid-cols-3 gap-6">
            {[['1', 'Get your free audit', 'Enter your business name and city. See your score, competitors and top 3 fixes.'],
              ['2', 'Pick a plan', 'Choose the fix that plugs your biggest leak. No long contract.'],
              ['3', 'We run it for you', 'Text-back, reviews, website and Google profile, handled while you work.']].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl border border-slate-800 p-6">
                <span className="text-teal-400 font-extrabold text-3xl">{n}</span>
                <h3 className="mt-2 font-semibold text-white">{t}</h3>
                <p className="mt-1 text-sm text-slate-400">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="plans" className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-bold text-white text-center">Plans</h2>
          <p className="mt-2 text-center text-slate-400">Start with the free audit. It tells you which plan fixes your biggest leak.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((p) => (
              <div key={p.id} className={`rounded-2xl border p-6 flex flex-col ${p.featured ? 'border-teal-500 bg-teal-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
                {p.featured && <span className="self-start text-xs font-bold uppercase tracking-wide text-teal-300 mb-2">Most popular</span>}
                <h3 className="font-semibold text-white text-lg">{p.name}</h3>
                <p className="mt-3"><span className="text-3xl font-extrabold text-white">{p.price}</span><span className="text-slate-400">{p.per}</span></p>
                <p className="text-xs text-slate-500">{p.setup}</p>
                <p className="mt-3 text-sm text-slate-400">{p.pitch}</p>
                <ul className="mt-4 space-y-2 text-sm flex-1">
                  {p.points.map((pt) => <li key={pt} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />{pt}</li>)}
                </ul>
                <a href={`/free-audit?plan=${p.id}`} className="mt-6 text-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold py-2.5">Get started</a>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-bold text-white text-center">Questions</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map(([q, a]) => (
              <details key={q} className="rounded-xl border border-slate-800 p-5">
                <summary className="font-semibold text-white cursor-pointer">{q}</summary>
                <p className="mt-2 text-slate-400">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">See exactly where you're losing jobs.</h2>
          <a href="/free-audit" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-lg px-7 py-4">
            Run my free audit <ArrowRight className="w-5 h-5" />
          </a>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500 px-6">
        <p>© 2026 AImHighAI · <a href="/privacy" className="hover:text-white">Privacy</a> · <a href="/terms" className="hover:text-white">Terms</a> · <a href="/disclaimer" className="hover:text-white">Disclaimers</a> · <a href="/security" className="hover:text-white">Security</a> · <a href="/login" className="hover:text-white">Sign in</a></p>
        <p className="mt-2 text-xs">Results vary and are not guaranteed. Some links are affiliate links; we may earn a commission at no extra cost to you.</p>
      </footer>
    </div>
  )
}

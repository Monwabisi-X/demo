import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WealthEstimator } from '@/components/public/WealthEstimator';
import { Button, Badge } from '@/components/ui';

const PRODUCTS = [
  { code: 'LIFE', name: 'Life Cover', blurb: 'Protect your family with a benefit paid on death.' },
  { code: 'DISABILITY', name: 'Disability', blurb: 'Income and lump-sum cover if you cannot work.' },
  { code: 'CRITICAL_ILLNESS', name: 'Critical Illness', blurb: 'A payout on diagnosis of a covered condition.' },
  { code: 'INCOME_PROTECTION', name: 'Income Protection', blurb: 'Replace a portion of income while unable to earn.' },
  { code: 'RETIREMENT_ANNUITY', name: 'Retirement Annuity', blurb: 'Tax-efficient long-term retirement savings.' },
  { code: 'UNIT_TRUST', name: 'Unit Trusts', blurb: 'Goal-based investing across diversified funds.' },
  { code: 'TAX_FREE', name: 'Tax-Free Savings', blurb: 'Grow your money free of tax within limits.' },
  { code: 'MOTOR', name: 'Motor & Home', blurb: 'Short-term cover for your vehicle and property.' },
];

const SECURITY = [
  { title: 'POPIA by design', body: 'Purpose-bound processing, versioned consent, and data-subject controls built in.' },
  { title: 'In-region hosting', body: 'All client data is hosted in AWS Cape Town (af-south-1) — no cross-border transfer.' },
  { title: 'Encrypted everywhere', body: 'Sensitive fields use envelope encryption (AWS KMS); documents are private and versioned.' },
  { title: 'Fully audited', body: 'Every change is written to an immutable audit trail; sensitive reads are logged.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-slide-up">
            <Badge tone="maroon">Authorised financial services provider</Badge>
            <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-ink md:text-5xl">
              Advice, protection and growth —
              <span className="text-maroon"> held to a higher standard.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-ink-soft">
              Royal Square Financial helps individuals and families understand insurance and
              goal-based investments, and manage them in one secure, POPIA-aligned place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/onboarding">
                <Button size="lg">Start your profile</Button>
              </Link>
              <a href="#estimator">
                <Button size="lg" variant="outline">Try the estimator</Button>
              </a>
            </div>
            <p className="mt-6 text-xs text-ink-faint">
              Talk to Koisa, our assistant, any time — bottom-right of your screen.
            </p>
          </div>

          {/* Hero stat panel */}
          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-8 shadow-card">
            <p className="eyebrow">At a glance</p>
            <div className="mt-4 grid grid-cols-2 gap-6">
              {[
                { k: 'Product lines advised', v: '16+' },
                { k: 'Data residency', v: 'af-south-1' },
                { k: 'Consent model', v: 'Versioned' },
                { k: 'Audit trail', v: 'Immutable' },
              ].map((s) => (
                <div key={s.k}>
                  <p className="font-serif text-2xl font-semibold text-ink">{s.v}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{s.k}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-maroon-tint px-4 py-3 text-sm text-maroon">
              We never ask for sensitive details in chat — your privacy is protected by design.
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="border-t border-cream-300 bg-cream-100">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow">What we advise on</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">Cover and investment products</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            General overviews — an adviser will tailor recommendations to your needs analysis.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <div key={p.code} className="group rounded-xl border border-cream-300 bg-cream-50 p-5 transition-shadow hover:shadow-card">
                <div className="mb-3 h-8 w-8 rounded-md bg-maroon/10 ring-1 ring-maroon/20 transition-colors group-hover:bg-maroon/20" />
                <h3 className="font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-sm text-ink-faint">{p.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estimator */}
      <section id="estimator" className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Interactive</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">Wealth & cover estimator</h2>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Move the sliders to see an indicative projection. This is an illustration, not advice.
        </p>
        <div className="mt-8">
          <WealthEstimator />
        </div>
      </section>

      {/* Security / POPIA */}
      <section id="security" className="border-t border-cream-300 bg-ink text-cream-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow text-maroon-tint">Security & privacy</p>
          <h2 className="mt-2 font-serif text-3xl">Built for trust and POPIA compliance</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map((s) => (
              <div key={s.title} className="rounded-xl border border-cream-50/10 bg-cream-50/[0.03] p-5">
                <h3 className="font-semibold text-cream-50">{s.title}</h3>
                <p className="mt-2 text-sm text-cream-300">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/onboarding">
              <Button size="lg">Get started securely</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-cream-50/30 text-cream-50 hover:bg-cream-50/10">
                Client sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

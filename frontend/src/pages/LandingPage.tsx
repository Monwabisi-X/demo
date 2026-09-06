import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WealthEstimator } from '@/components/public/WealthEstimator';
import { Button } from '@/components/ui';
import {
  HeartPulse, Accessibility, Stethoscope, Briefcase,
  PiggyBank, BarChart3, Leaf, Car,
  ShieldCheck, Lock, ClipboardList,
} from 'lucide-react';

const PRODUCTS = [
  { code: 'LIFE', name: 'Life Cover', blurb: 'Protect your family with a benefit paid on death.', Icon: HeartPulse },
  { code: 'DISABILITY', name: 'Disability', blurb: 'Income and lump-sum cover if you cannot work.', Icon: Accessibility },
  { code: 'CRITICAL_ILLNESS', name: 'Critical Illness', blurb: 'A payout on diagnosis of a covered condition.', Icon: Stethoscope },
  { code: 'INCOME_PROTECTION', name: 'Income Protection', blurb: 'Replace a portion of income while unable to earn.', Icon: Briefcase },
  { code: 'RETIREMENT_ANNUITY', name: 'Retirement Annuity', blurb: 'Tax-efficient long-term retirement savings.', Icon: PiggyBank },
  { code: 'UNIT_TRUST', name: 'Unit Trusts', blurb: 'Goal-based investing across diversified funds.', Icon: BarChart3 },
  { code: 'TAX_FREE', name: 'Tax-Free Savings', blurb: 'Grow your money free of tax within limits.', Icon: Leaf },
  { code: 'MOTOR', name: 'Motor & Home', blurb: 'Short-term cover for your vehicle and property.', Icon: Car },
];

const SECURITY = [
  { title: 'POPIA by design', body: 'Purpose-bound processing, versioned consent, and data-subject controls built in.', Icon: ShieldCheck },
  { title: 'Encrypted everywhere', body: 'Sensitive fields use envelope encryption (AWS KMS); documents are private and versioned.', Icon: Lock },
  { title: 'Fully audited', body: 'Every change is written to an immutable audit trail; sensitive reads are logged.', Icon: ClipboardList },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-slide-up">
            <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-ink md:text-5xl">
              Advice, protection and growth —
              <span className="text-maroon"> held to a higher standard.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-ink-soft">
              Royal Square Financial helps individuals and families understand insurance and
              goal-based investments, and manage them in one secure, POPIA-aligned place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/onboarding">
                <Button size="lg">Start your profile</Button>
              </Link>
              <a href="#estimator">
                <Button size="lg" variant="outline">Try the estimator</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              Have questions? Use the <span className="font-medium text-ink-soft">Ask Koisa</span> button at the bottom-right.
            </p>
          </div>

          {/* Hero feature panel */}
          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-8 shadow-card">
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'Protection', blurb: 'Life, disability & critical illness cover.', Icon: HeartPulse },
                { label: 'Investments', blurb: 'RA, unit trusts & tax-free savings.', Icon: BarChart3 },
                { label: 'Compliance', blurb: 'POPIA-aligned, fully audited.', Icon: ShieldCheck },
                { label: 'Security', blurb: 'Encrypted at rest and in transit.', Icon: Lock },
              ].map(({ label, blurb, Icon }) => (
                <div key={label} className="flex flex-col gap-2 rounded-xl border border-cream-300 bg-cream-100 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maroon/10">
                    <Icon size={18} className="text-maroon" strokeWidth={1.8} />
                  </span>
                  <p className="font-semibold text-ink">{label}</p>
                  <p className="text-xs text-ink-faint">{blurb}</p>
                </div>
              ))}
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
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-maroon/10 ring-1 ring-maroon/20 transition-colors group-hover:bg-maroon/20">
                  <p.Icon size={18} className="text-maroon" strokeWidth={1.8} />
                </span>
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
            {SECURITY.map(({ title, body, Icon }) => (
              <div key={title} className="rounded-xl border border-cream-50/10 bg-cream-50/[0.03] p-5">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-maroon/20">
                  <Icon size={18} className="text-maroon-tint" strokeWidth={1.8} />
                </span>
                <h3 className="font-semibold text-cream-50">{title}</h3>
                <p className="mt-2 text-sm text-cream-300">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/onboarding">
              <Button size="lg">Get started securely</Button>
            </Link>
            <Link to="/client-login">
              <Button
                size="lg"
                variant="outline"
                className="border-cream-50 bg-transparent text-maroon hover:bg-cream-50/10"
              >
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

import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WealthEstimator } from '@/components/public/WealthEstimator';
import { Button } from '@/components/ui';
import {
  HeartPulse, Accessibility, Stethoscope, Briefcase,
  PiggyBank, BarChart3, Leaf, Car,
  ShieldCheck, Lock, ClipboardList,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  HandCoins,
  Users,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

const PRODUCTS = [
  { code: 'LIFE', name: 'Life Cover', blurb: 'Protect your family with a dependable benefit when life changes unexpectedly.', Icon: HeartPulse },
  { code: 'DISABILITY', name: 'Disability', blurb: 'Replace income and reduce financial stress when illness or injury affects your ability to work.', Icon: Accessibility },
  { code: 'CRITICAL_ILLNESS', name: 'Critical Illness', blurb: 'Access a lump sum when a serious illness demands focused financial support.', Icon: Stethoscope },
  { code: 'INCOME_PROTECTION', name: 'Income Protection', blurb: 'Keep your household stable when you cannot earn for a period of time.', Icon: Briefcase },
  { code: 'RETIREMENT_ANNUITY', name: 'Retirement Annuity', blurb: 'Build long-term retirement wealth with disciplined, tax-efficient saving.', Icon: PiggyBank },
  { code: 'UNIT_TRUST', name: 'Unit Trusts', blurb: 'Invest toward medium- and long-term goals with diversified portfolio options.', Icon: BarChart3 },
  { code: 'TAX_FREE', name: 'Tax-Free Savings', blurb: 'Grow your money without tax drag within the permitted annual and lifetime caps.', Icon: Leaf },
  { code: 'MOTOR', name: 'Motor & Home', blurb: 'Protect the property and transport you rely on every day.', Icon: Car },
];

const SECURITY = [
  { title: 'POPIA by design', body: 'Purpose-bound processing, versioned consent and clear data controls keep personal information protected.', Icon: ShieldCheck },
  { title: 'Encrypted everywhere', body: 'Sensitive fields are encrypted in transit and at rest, using secure, auditable handling patterns.', Icon: Lock },
  { title: 'Fully audited', body: 'Every material change is recorded in an audit trail so activity stays reviewable and accountable.', Icon: ClipboardList },
];

const ABOUT_PILLARS = [
  {
    title: 'Life, wealth and risk planning',
    description: 'We help clients match protection products, savings strategies and long-term goals to their real-life priorities — from a home deposit to retirement and family security.',
    icon: HandCoins,
  },
  {
    title: 'Clear, practical advice',
    description: 'Every recommendation is grounded in understanding, not jargon. We explain trade-offs, policy terms, tax treatment and affordability in plain language.',
    icon: TrendingUp,
  },
  {
    title: 'Security and trust',
    description: 'Our platform is built with POPIA-aware handling, encrypted records and structured audit trails to protect sensitive financial information.',
    icon: ShieldCheck,
  },
  {
    title: 'Client-first support',
    description: 'We believe financial decisions work best when they are reviewed regularly, revisited as life changes, and supported by a clear plan that stays relevant.',
    icon: Users,
  },
];

const INFORMATION_TOPICS = [
  {
    title: 'Protection and risk cover',
    blurb: 'Understand life cover, income protection, disability cover and the situations in which each type of policy may be most useful.',
    icon: HeartPulse,
  },
  {
    title: 'Retirement and tax planning',
    blurb: 'Learn how retirement annuities, TFSAs and other savings vehicles fit together in a long-term financial plan.',
    icon: PiggyBank,
  },
  {
    title: 'Investment basics',
    blurb: 'Explore diversification, long-term investing, risk management and how to build a sensible strategy around your goals.',
    icon: TrendingUp,
  },
  {
    title: 'POPIA and security',
    blurb: 'See how consent, document handling and data security are designed to protect your information and support responsible advice.',
    icon: ShieldCheck,
  },
];

const HIGHLIGHTS = [
  'Support for family protection, savings and investments',
  'Clear guidance tailored to your life stage and goals',
  'A secure client portal with real plan visibility',
  'Practical education before you commit to a decision',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <PublicHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(110,20,35,0.12),_transparent_62%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-slide-up">
            <p className="eyebrow">Advice that feels grounded in real life</p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.06] text-ink md:text-6xl">
              Protect what matters.
              <span className="mt-2 block text-maroon">Grow with confidence.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-ink-soft md:text-lg">
              Royal Square Financial helps families and professionals protect their income,
              plan for major life events and build sustainable wealth with clear guidance and
              secure digital support.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/onboarding">
                <Button size="lg">Start your plan</Button>
              </Link>
              <a href="#estimator">
                <Button size="lg" variant="outline">Try the estimator</Button>
              </a>
            </div>

            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ink-soft">
                  <CheckCircle2 className="mt-0.5 text-maroon" size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-slide-up rounded-2xl border border-cream-300 bg-cream-50 p-8 shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-faint">What clients gain</p>
                <h2 className="font-serif text-2xl text-ink">A calmer way to plan ahead</h2>
              </div>
              <div className="rounded-full bg-maroon/10 px-3 py-1 text-xs font-medium text-maroon">Trusted</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Protection', value: 'Life & risk cover', Icon: HeartPulse },
                { label: 'Growth', value: 'Savings & investments', Icon: TrendingUp },
                { label: 'Guidance', value: 'Expert advice', Icon: HandCoins },
                { label: 'Security', value: 'POPIA-safe', Icon: ShieldCheck },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-xl border border-cream-300 bg-cream-100 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10 text-maroon">
                    <Icon size={18} />
                  </span>
                  <p className="mt-4 font-semibold text-ink">{label}</p>
                  <p className="mt-1 text-sm text-ink-faint">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-maroon/20 bg-maroon/5 p-4">
              <div className="flex items-center justify-between gap-4 text-sm text-ink-soft">
                <span>Planning confidence</span>
                <span className="font-semibold text-maroon">Built around you</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <CheckCircle2 className="text-maroon" size={14} />
                Peace of mind for life, income and long-term goals
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1.25fr_0.75fr] md:items-center">
          <div>
            <p className="eyebrow">About Royal Square</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              Helping people build financial confidence with clarity and care.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">
              Royal Square Financial works with individuals, families and professionals who want more than a generic product recommendation. We focus on protecting income, building long-term wealth and creating a calm, structured plan that is realistic and sustainable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/onboarding">
                <Button size="lg">Start your plan</Button>
              </Link>
              <a href="#information">
                <Button size="lg" variant="outline">Explore information</Button>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-maroon/10 p-3 text-maroon">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="text-sm text-ink-faint">Advisory approach</p>
                <p className="font-semibold text-ink">Practical. Personal. Progressive.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {['Understand your current situation, goals and risk appetite.', 'Review suitable protection, savings and investment choices.', 'Build a tailored plan with realistic timelines and costs.', 'Monitor progress and adjust as life changes.'].map((step, index) => (
                <div key={step} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-ink-soft">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <p className="eyebrow">Why clients choose us</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {ABOUT_PILLARS.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-4 inline-flex rounded-xl bg-maroon/10 p-3 text-maroon">
                  <Icon size={20} />
                </div>
                <h3 className="text-xl font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="border-t border-cream-300 bg-cream-100">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">What we advise on</p>
              <h2 className="mt-2 font-serif text-3xl text-ink">Smart solutions for the life you live now</h2>
            </div>
            <a href="#information" className="inline-flex items-center gap-2 text-sm font-medium text-maroon hover:text-maroon-light">
              Explore the information centre <ArrowRight size={16} />
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <div key={p.code} className="group rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-maroon/10 ring-1 ring-maroon/15 transition-colors group-hover:bg-maroon/20">
                  <p.Icon size={18} className="text-maroon" strokeWidth={1.8} />
                </span>
                <h3 className="font-semibold text-ink">{p.name}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-faint">{p.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="information" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="eyebrow">Educational resources</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              Information that makes financial decisions easier to understand.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">
              Explore practical, plain-language information on protection, investing, budgeting and financial planning. This is general educational content designed to help you think more clearly before you speak with an adviser.
            </p>
          </div>

          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
            <div className="inline-flex rounded-xl bg-maroon/10 p-3 text-maroon">
              <BookOpen size={22} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">What you will find here</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 text-maroon" size={16} />Plain-language guides and checklists</li>
              <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 text-maroon" size={16} />Protection, retirement and investment explainers</li>
              <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 text-maroon" size={16} />Helpful points for conversations with your adviser</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {INFORMATION_TOPICS.map(({ title, blurb, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="mb-4 inline-flex rounded-xl bg-maroon/10 p-3 text-maroon">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{blurb}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl border border-cream-300 bg-ink px-6 py-8 text-cream-50 md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow text-maroon-tint">Need tailored guidance?</p>
              <h2 className="mt-2 font-serif text-3xl">Start with a clear picture of your needs.</h2>
            </div>
            <Link to="/onboarding">
              <Button size="lg">Create your profile</Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="estimator" className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Interactive planning</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">Wealth & cover estimator</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Use the estimator to test different assumptions, understand affordability and see how your goals could evolve over time. This is a planning illustration, not advice.
        </p>
        <div className="mt-8">
          <WealthEstimator />
        </div>
      </section>

      <section id="security" className="border-t border-cream-300 bg-ink text-cream-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow text-maroon-tint">Security & privacy</p>
          <h2 className="mt-2 font-serif text-3xl">Built for trust, compliance and long-term peace of mind</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map(({ title, body, Icon }) => (
              <div key={title} className="rounded-2xl border border-cream-50/10 bg-cream-50/[0.03] p-5">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-maroon/20">
                  <Icon size={18} className="text-maroon-tint" strokeWidth={1.8} />
                </span>
                <h3 className="font-semibold text-cream-50">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-cream-300">{body}</p>
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

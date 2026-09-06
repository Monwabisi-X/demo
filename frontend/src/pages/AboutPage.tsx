import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Button } from '@/components/ui';
import { ShieldCheck, HandCoins, TrendingUp, Users, Clock3, CheckCircle2 } from 'lucide-react';

const pillars = [
  {
    title: 'Life, wealth and risk planning',
    description:
      'We help clients match protection products, savings strategies and long-term goals to their real-life priorities — from a home deposit to retirement and family security.',
    icon: HandCoins,
  },
  {
    title: 'Clear, practical advice',
    description:
      'Every recommendation is grounded in understanding, not jargon. We explain trade-offs, policy terms, tax treatment, and affordability in plain language.',
    icon: TrendingUp,
  },
  {
    title: 'Security and trust',
    description:
      'Our platform is built with POPIA-aware handling, encrypted records and structured audit trails to protect sensitive financial information.',
    icon: ShieldCheck,
  },
  {
    title: 'Client-first support',
    description:
      'We believe financial decisions work best when they are reviewed regularly, revisited as life changes, and supported by a clear plan that stays relevant.',
    icon: Users,
  },
];

const steps = [
  'Understand your current situation, goals and risk appetite.',
  'Review suitable protection, savings and investment choices.',
  'Build a tailored plan with realistic timelines and costs.',
  'Monitor progress and adjust as life changes.',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <section className="grid gap-10 md:grid-cols-[1.25fr_0.75fr] md:items-center">
          <div>
            <p className="eyebrow">About Royal Square</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              Helping people build financial confidence with clarity and care.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">
              Royal Square Financial works with individuals, families and professionals who want more
              than a generic product recommendation. We focus on protecting income, building long-term
              wealth and creating a calm, structured plan that is realistic and sustainable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/onboarding">
                <Button size="lg">Start your plan</Button>
              </Link>
              <Link to="/information">
                <Button size="lg" variant="outline">Explore information</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-maroon/10 p-3 text-maroon">
                <Clock3 size={20} />
              </div>
              <div>
                <p className="text-sm text-ink-faint">Advisory approach</p>
                <p className="font-semibold text-ink">Practical. Personal. Progressive.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-ink-soft">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <p className="eyebrow">Why clients choose us</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-4 inline-flex rounded-xl bg-maroon/10 p-3 text-maroon">
                  <Icon size={20} />
                </div>
                <h2 className="text-xl font-semibold text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-cream-300 bg-ink px-6 py-8 text-cream-50 md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow text-maroon-tint">Our promise</p>
              <h2 className="mt-2 font-serif text-3xl">Financial guidance that feels human and actionable.</h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-cream-300">
              <CheckCircle2 className="text-maroon-tint" />
              Confidential, compliant and client-centred.
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

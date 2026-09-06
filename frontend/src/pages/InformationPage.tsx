import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Button } from '@/components/ui';
import {
  BookOpen,
  ShieldCheck,
  HeartPulse,
  PiggyBank,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

const topics = [
  {
    title: 'Protection and risk cover',
    blurb:
      'Understand life cover, income protection, disability cover and the situations in which each type of policy may be most useful.',
    icon: HeartPulse,
  },
  {
    title: 'Retirement and tax planning',
    blurb:
      'Learn how retirement annuities, TFSAs and other savings vehicles fit together in a long-term financial plan.',
    icon: PiggyBank,
  },
  {
    title: 'Investment basics',
    blurb:
      'Explore diversification, long-term investing, risk management and how to build a sensible strategy around your goals.',
    icon: TrendingUp,
  },
  {
    title: 'POPIA and security',
    blurb:
      'See how consent, document handling and data security are designed to protect your information and support responsible advice.',
    icon: ShieldCheck,
  },
];

const articles = [
  {
    title: 'What to review before buying cover',
    text: 'Income, dependants, debt, existing policies and your future goals all matter when choosing the right protection level.',
  },
  {
    title: 'Why retirement planning starts early',
    text: 'The power of compounding means small consistent savings often outperform large, late-stage catch-up efforts.',
  },
  {
    title: 'How to keep your financial plan realistic',
    text: 'An affordable, flexible plan is far more effective than one built on optimism and not aligned to your actual costs.',
  },
  {
    title: 'Reading your policy schedule carefully',
    text: 'Cover, exclusions, waiting periods and excess structures all shape the value you receive when a claim is made.',
  },
];

export default function InformationPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="eyebrow">Educational resources</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              Information that makes financial decisions easier to understand.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">
              Explore practical, plain-language information on protection, investing, budgeting and financial planning.
              This is general educational content designed to help you think more clearly before you speak with an adviser.
            </p>
          </div>

          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
            <div className="inline-flex rounded-xl bg-maroon/10 p-3 text-maroon">
              <BookOpen size={22} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-ink">What you will find here</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 text-maroon" size={16} />Plain-language guides and checklists</li>
              <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 text-maroon" size={16} />Protection, retirement and investment explainers</li>
              <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 text-maroon" size={16} />Helpful points for conversations with your adviser</li>
            </ul>
          </div>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {topics.map(({ title, blurb, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="mb-4 inline-flex rounded-xl bg-maroon/10 p-3 text-maroon">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{blurb}</p>
            </div>
          ))}
        </section>

        <section className="mt-20">
          <p className="eyebrow">Featured articles</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {articles.map((article) => (
              <article key={article.title} className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card">
                <h3 className="text-xl font-semibold text-ink">{article.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{article.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-cream-300 bg-ink px-6 py-8 text-cream-50 md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow text-maroon-tint">Need tailored guidance?</p>
              <h2 className="mt-2 font-serif text-3xl">Start with a clear picture of your needs.</h2>
            </div>
            <Link to="/onboarding">
              <Button size="lg">Create your profile</Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

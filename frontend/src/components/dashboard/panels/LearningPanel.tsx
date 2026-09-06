import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningApi } from '@/api/learning.api';
import type { LearningArticle } from '@/api/types';
import { Card, Badge, Loading, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  Car, HeartPulse, Accessibility, PiggyBank, Leaf, BarChart3,
  GraduationCap, BookOpen, ChevronDown, Clock,
} from 'lucide-react';

/**
 * Client-facing Information / Learning tab. Surfaces training and guides on car (motor), life
 * and accident/disability claims, plus suggested-investment explainers. Content is served by
 * the backend (/learning) and grouped by category; a static fallback keeps the tab useful even
 * if the API is empty or unreachable. This is general information, never advice.
 */

const CATEGORY_META: Record<string, { label: string; eyebrow: string }> = {
  CLAIM_GUIDE: { label: 'Claims guides', eyebrow: 'How to claim' },
  INVESTMENT: { label: 'Suggested investments', eyebrow: 'Grow your money' },
  TRAINING: { label: 'Training & essentials', eyebrow: 'Learn the basics' },
  GUIDE: { label: 'Guides', eyebrow: 'Good to know' },
};

const CATEGORY_ORDER = ['CLAIM_GUIDE', 'INVESTMENT', 'TRAINING', 'GUIDE'];

const TOPIC_ICON: Record<string, React.ElementType> = {
  MOTOR: Car,
  LIFE: HeartPulse,
  ACCIDENT: Accessibility,
  RETIREMENT_ANNUITY: PiggyBank,
  TAX_FREE: Leaf,
  UNIT_TRUST: BarChart3,
  GENERAL: BookOpen,
};

export function LearningPanel() {
  const articles = useQuery({
    queryKey: ['learning'],
    queryFn: () => learningApi.list(),
    staleTime: 5 * 60_000,
  });

  if (articles.isLoading) return <Loading label="Loading your learning centre…" />;

  // Graceful fallback: if the API errored or returned nothing, use bundled static content so
  // the tab is never blank. Clients can still learn the essentials offline of the content API.
  const rows: LearningArticle[] =
    articles.data && articles.data.length > 0 ? articles.data : STATIC_FALLBACK;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    meta: CATEGORY_META[cat] || { label: cat, eyebrow: 'Learn' },
    items: rows.filter((r) => r.category === cat).sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Information &amp; learning</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Learning centre</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Training and step-by-step guides on claiming for your car, life and accident cover — plus
          plain-language explainers on ways to grow your money. This is general information, not advice;
          your adviser will tailor recommendations to your needs.
        </p>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          title="No learning content yet"
          description="Guides and training will appear here once published."
        />
      ) : (
        grouped.map((g) => (
          <section key={g.cat} className="space-y-4">
            <div className="flex items-center gap-2">
              {g.cat === 'TRAINING' ? (
                <GraduationCap size={18} className="text-maroon" strokeWidth={1.8} />
              ) : (
                <BookOpen size={18} className="text-maroon" strokeWidth={1.8} />
              )}
              <div>
                <p className="eyebrow">{g.meta.eyebrow}</p>
                <h2 className="font-serif text-xl text-ink">{g.meta.label}</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {g.items.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: LearningArticle }) {
  const [open, setOpen] = useState(false);
  const Icon = TOPIC_ICON[article.topic || 'GENERAL'] || BookOpen;
  const hasSteps = Array.isArray(article.steps) && article.steps.length > 0;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maroon/10 ring-1 ring-maroon/20">
          <Icon size={18} className="text-maroon" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-ink">{article.title}</h3>
          {article.summary && <p className="mt-1 text-sm text-ink-faint">{article.summary}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <Clock size={13} strokeWidth={1.8} />
        <span>{article.read_minutes} min read</span>
        {article.topic && <Badge tone="neutral">{article.topic.replace(/_/g, ' ').toLowerCase()}</Badge>}
      </div>

      {article.body && <p className="text-sm leading-relaxed text-ink-soft">{article.body}</p>}

      {hasSteps && (
        <div className="border-t border-cream-300 pt-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between text-sm font-medium text-maroon hover:text-maroon-light"
            aria-expanded={open}
          >
            <span>Step-by-step guide ({article.steps.length} steps)</span>
            <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <ol className="mt-3 space-y-2">
              {article.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-soft">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-maroon text-[11px] font-semibold text-cream-50">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Card>
  );
}

/** Minimal static content used only when the /learning API returns nothing. */
const STATIC_FALLBACK: LearningArticle[] = [
  {
    id: 'fallback-motor',
    category: 'CLAIM_GUIDE',
    topic: 'MOTOR',
    slug: 'how-to-claim-car-accident',
    title: 'How to claim after a car accident',
    summary: 'A step-by-step guide to lodging a motor claim quickly and correctly.',
    body: 'A motor claim goes more smoothly when you gather the right information at the scene and lodge promptly.',
    steps: [
      'Ensure everyone is safe and call emergency services if anyone is injured.',
      'Do not admit liability at the scene.',
      'Photograph all vehicles, damage, number plates and the road layout.',
      'Exchange details with other drivers and get a SAPS case reference.',
      'Report the claim to your adviser or insurer within the policy time limit.',
    ],
    read_minutes: 4,
    sort_order: 10,
  },
  {
    id: 'fallback-life',
    category: 'CLAIM_GUIDE',
    topic: 'LIFE',
    slug: 'how-to-claim-life-cover',
    title: 'How a life cover claim works',
    summary: 'What beneficiaries need to do to claim a life policy benefit.',
    body: 'A life cover claim is lodged by the nominated beneficiary after the life assured has passed away.',
    steps: [
      'Notify your adviser or the insurer as soon as possible.',
      'Obtain the death certificate and notice of death.',
      'Provide the beneficiary ID and banking details.',
      'Complete the insurer claim form with the policy number if known.',
    ],
    read_minutes: 3,
    sort_order: 20,
  },
  {
    id: 'fallback-accident',
    category: 'CLAIM_GUIDE',
    topic: 'ACCIDENT',
    slug: 'how-to-claim-accident-disability',
    title: 'Claiming for accident, injury or disability',
    summary: 'How to claim under personal accident, income protection or disability benefits.',
    body: 'Accident and disability benefits help replace income or provide a lump sum when an injury stops you working.',
    steps: [
      'Get medical treatment and keep all reports and receipts.',
      'Notify your adviser or insurer promptly.',
      'Complete the claim form with the treating doctor’s medical report.',
      'Provide proof of income if claiming income protection.',
    ],
    read_minutes: 4,
    sort_order: 30,
  },
  {
    id: 'fallback-ra',
    category: 'INVESTMENT',
    topic: 'RETIREMENT_ANNUITY',
    slug: 'retirement-annuity-explained',
    title: 'Retirement Annuity (RA): tax-smart retirement saving',
    summary: 'How an RA works and the tax benefits — a general explainer.',
    body: 'A Retirement Annuity is a long-term, tax-efficient way to save for retirement, with tax-deductible contributions within limits.',
    steps: [],
    read_minutes: 3,
    sort_order: 40,
  },
  {
    id: 'fallback-tfsa',
    category: 'INVESTMENT',
    topic: 'TAX_FREE',
    slug: 'tax-free-savings-explained',
    title: 'Tax-Free Savings Account (TFSA): growth free of tax',
    summary: 'The basics of a TFSA and how it fits alongside other goals.',
    body: 'A TFSA lets your investment grow free of tax on interest, dividends and capital gains, within annual and lifetime limits.',
    steps: [],
    read_minutes: 3,
    sort_order: 50,
  },
  {
    id: 'fallback-unit-trust',
    category: 'INVESTMENT',
    topic: 'UNIT_TRUST',
    slug: 'unit-trusts-explained',
    title: 'Unit Trusts: goal-based investing, diversified',
    summary: 'What unit trusts are and how diversification reduces risk.',
    body: 'Unit trusts pool investors’ money into professionally managed, diversified portfolios matched to your goal and time horizon.',
    steps: [],
    read_minutes: 3,
    sort_order: 60,
  },
];

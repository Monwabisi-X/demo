import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';

/** A cream/maroon range slider row. */
function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink-soft">{label}</label>
        <span className="font-serif text-lg font-semibold text-maroon">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-cream-300 accent-maroon',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-maroon'
        )}
      />
    </div>
  );
}

/**
 * Interactive wealth / cover estimator. Pure client-side illustration (no advice given);
 * shows an indicative recommended life cover and a simple retirement projection.
 */
export function WealthEstimator() {
  const [age, setAge] = useState(35);
  const [income, setIncome] = useState(45000); // monthly
  const [savings, setSavings] = useState(250000);
  const [contribution, setContribution] = useState(4000); // monthly

  const result = useMemo(() => {
    const yearsToRetire = Math.max(0, 65 - age);
    const annualReturn = 0.09; // illustrative nominal
    const months = yearsToRetire * 12;
    const r = annualReturn / 12;

    // Future value of current savings + monthly contributions.
    const fvSavings = savings * Math.pow(1 + r, months);
    const fvContrib = r > 0 ? contribution * ((Math.pow(1 + r, months) - 1) / r) : contribution * months;
    const projected = fvSavings + fvContrib;

    // Indicative life cover: ~10x annual income (illustration only).
    const recommendedCover = income * 12 * 10;

    return { projected, recommendedCover, yearsToRetire };
  }, [age, income, savings, contribution]);

  return (
    <div className="grid gap-8 rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card md:grid-cols-2 md:p-8">
      <div className="space-y-6">
        <Slider label="Your age" value={age} min={18} max={64} step={1} format={(v) => `${v} yrs`} onChange={setAge} />
        <Slider label="Monthly income" value={income} min={5000} max={250000} step={1000} format={(v) => formatCurrency(v)} onChange={setIncome} />
        <Slider label="Current savings" value={savings} min={0} max={5000000} step={10000} format={(v) => formatCurrency(v)} onChange={setSavings} />
        <Slider label="Monthly contribution" value={contribution} min={0} max={50000} step={500} format={(v) => formatCurrency(v)} onChange={setContribution} />
      </div>

      <div className="flex flex-col justify-center gap-4 rounded-xl bg-ink p-6 text-cream-50">
        <div>
          <p className="eyebrow text-maroon-tint">Projected at retirement (65)</p>
          <p className="mt-1 font-serif text-3xl font-semibold">{formatCurrency(result.projected)}</p>
          <p className="mt-1 text-xs text-cream-300">{result.yearsToRetire} years of growth · illustrative 9% p.a.</p>
        </div>
        <div className="h-px bg-cream-50/10" />
        <div>
          <p className="eyebrow text-maroon-tint">Indicative life cover</p>
          <p className="mt-1 font-serif text-3xl font-semibold">{formatCurrency(result.recommendedCover)}</p>
          <p className="mt-1 text-xs text-cream-300">≈ 10× annual income</p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-cream-400">
          For illustration only. Not financial advice. Speak to an adviser for a personalised
          needs analysis.
        </p>
      </div>
    </div>
  );
}

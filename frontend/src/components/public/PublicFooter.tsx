import { Logo } from '@/components/ui';

export function PublicFooter() {
  return (
    <footer className="border-t border-cream-300 bg-cream-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-faint">
            Royal Square Financial is an authorised financial services provider. We advise on
            insurance and goal-based investment products; we are not an insurer or investment
            manager.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Company</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><a href="#products" className="hover:text-maroon">Products</a></li>
            <li><a href="#security" className="hover:text-maroon">Security & POPIA</a></li>
            <li><a href="#estimator" className="hover:text-maroon">Wealth estimator</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Compliance</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>POPIA-aligned processing</li>
            <li>Data hosted in af-south-1</li>
            <li>Encrypted at rest & in transit</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream-300 py-4 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Royal Square Financial. All rights reserved.
      </div>
    </footer>
  );
}

import { Logo } from '@/components/ui';

import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t border-cream-300 bg-cream-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-faint">
            Royal Square Financial helps South African households protect what matters,
            plan for the future, and make confident decisions with practical advice and clear
            financial guidance.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Company</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><a href="#about" className="hover:text-maroon">About us</a></li>
            <li><a href="#information" className="hover:text-maroon">Information centre</a></li>
            <li><Link to="/onboarding" className="hover:text-maroon">Get started</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Compliance</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>POPIA-aligned</li>
            <li>Encrypted at rest & in transit</li>
            <li>Audit-ready records</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream-300 py-4 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Royal Square Financial. All rights reserved.
      </div>
    </footer>
  );
}

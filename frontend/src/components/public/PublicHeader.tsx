import { Link } from 'react-router-dom';
import { Logo, Button } from '@/components/ui';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-cream-300 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-soft md:flex">
          <a href="#products" className="hover:text-maroon">Products</a>
          <a href="#estimator" className="hover:text-maroon">Estimator</a>
          <a href="#security" className="hover:text-maroon">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/onboarding" className="hidden sm:block">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

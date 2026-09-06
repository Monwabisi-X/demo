import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toApiError } from '@/api/client';
import { clientLoginSchema, type ClientLoginFormData } from '@/schemas/authSchema';
import { Button, Input, Logo } from '@/components/ui';
import { ShieldCheck, Lock, GraduationCap } from 'lucide-react';

/**
 * Dedicated client portal sign-in — distinct from the staff/adviser login at /login.
 * Collects email + password only; the tenant is resolved server-side (POST /auth/client-login).
 * On success the client lands on their dashboard.
 */
export default function ClientLoginPage() {
  const { clientLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientLoginFormData>({
    resolver: zodResolver(clientLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: ClientLoginFormData) {
    setFormError(null);
    try {
      await clientLogin(data);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(toApiError(err).message);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: client-focused brand panel */}
      <div className="relative hidden flex-col justify-between bg-maroon p-12 text-cream-50 lg:flex">
        <Logo className="[&_span]:text-cream-50" />
        <div>
          <p className="eyebrow text-cream-200">Client portal</p>
          <h1 className="mt-3 max-w-md font-serif text-4xl leading-tight text-cream-50">
            Your cover, claims and learning — all in one secure place.
          </h1>
          <ul className="mt-6 space-y-3 text-sm text-cream-100">
            <li className="flex items-center gap-3"><ShieldCheck size={18} strokeWidth={1.8} /> View your policies and track claims</li>
            <li className="flex items-center gap-3"><GraduationCap size={18} strokeWidth={1.8} /> Guides on car, life &amp; accident claims</li>
            <li className="flex items-center gap-3"><Lock size={18} strokeWidth={1.8} /> POPIA-aligned, encrypted, hosted in af-south-1</li>
          </ul>
        </div>
        <p className="text-xs text-cream-200">POPIA-aligned · Encrypted at rest · Audit-logged</p>
      </div>

      {/* Right: client login form */}
      <div className="flex items-center justify-center bg-cream p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="eyebrow">Client portal</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">Sign in to your account</h2>
          <p className="mt-2 text-sm text-ink-faint">Use the email and password you registered with.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            {formError && (
              <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-3 py-2 text-sm text-maroon">
                {formError}
              </div>
            )}

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              Sign in to client portal
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/" className="text-ink-faint hover:text-maroon">
              ← Back to home
            </Link>
            <Link to="/onboarding" className="font-medium text-maroon hover:text-maroon-light">
              New client? Get started
            </Link>
          </div>
          <p className="mt-6 border-t border-cream-300 pt-4 text-center text-xs text-ink-faint">
            Adviser or staff member?{' '}
            <Link to="/login" className="font-medium text-ink-soft hover:text-maroon">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toApiError } from '@/api/client';
import { loginSchema, DEMO_TENANT_ID, type LoginFormData } from '@/schemas/authSchema';
import { Button, Input, Logo } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantId: DEMO_TENANT_ID, email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData) {
    setFormError(null);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(toApiError(err).message);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel (presentation gravitas) */}
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-cream-50 lg:flex">
        <Logo className="[&_span]:text-cream-50" />
        <div>
          <p className="eyebrow text-maroon-tint">Royal Square Financial</p>
          <h1 className="mt-3 max-w-md font-serif text-4xl leading-tight text-cream-50">
            Clarity, advice and protection — held to the highest standard.
          </h1>
          <p className="mt-4 max-w-md text-sm text-cream-300">
            Secure adviser and client platform. All data is processed in line with POPIA and
            hosted in-region (af-south-1).
          </p>
        </div>
        <p className="text-xs text-cream-400">POPIA-aligned · Encrypted at rest · Audit-logged</p>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center bg-cream p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="eyebrow">Welcome back</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">Sign in to your account</h2>

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
            <Input
              label="Tenant ID"
              hint="Pre-filled with the demo tenant."
              error={errors.tenantId?.message}
              {...register('tenantId')}
            />

            {formError && (
              <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-3 py-2 text-sm text-maroon">
                {formError}
              </div>
            )}

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              Sign in
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
        </div>
      </div>
    </div>
  );
}

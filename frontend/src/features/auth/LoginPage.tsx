import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { InlineAlert } from '@/components/ui/Feedback';
import { isApiError } from '@/lib/errors';
import { LoginRejectedError } from '@/lib/session';
import { useAuth } from './AuthProvider';
import { homePathFor } from './guards';
import { BrandMark } from '@/components/layout/Brand';

/** Mirrors LoginRequest: both fields @NotBlank. */
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});
type LoginValues = z.infer<typeof loginSchema>;

function describeFailure(error: unknown): { title: string; detail?: string } {
  if (error instanceof LoginRejectedError) return { title: 'This account can’t use the console', detail: error.message };
  if (isApiError(error)) {
    if (error.kind === 'unauthorized') return { title: error.message };
    if (error.kind === 'forbidden') {
      return { title: error.message, detail: 'Tenant administrators can sign in only while their organization is active.' };
    }
    if (error.kind === 'validation') return { title: 'Check your username and password', detail: error.message };
    return { title: error.message };
  }
  return { title: 'Sign-in failed. Try again.' };
}

export function LoginPage() {
  const { session, signIn, endReason, clearEndReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState<{ title: string; detail?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } });

  if (session) return <Navigate to={homePathFor(session.role)} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    clearEndReason();
    try {
      const next = await signIn(values);
      const from = (location.state as { from?: string } | null)?.from;
      const home = homePathFor(next.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (error) {
      setFailure(describeFailure(error));
    }
  });

  return (
    <main className="grid min-h-full bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-navy-900 px-12 py-12 text-navy-200 lg:flex lg:flex-col">
        <BrandMark tone="onNavy" />
        <div className="my-auto max-w-md">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.015em] text-white">
            Every request, governed before it reaches your services.
          </h1>
          <p className="mt-3 text-navy-300">
            Manage organizations, routes and gateway policies for the NexGate API gateway.
          </p>
          <PipelineSketch />
        </div>
        <p className="text-[12.5px] text-navy-300">Access is limited to platform and tenant administrators.</p>
      </aside>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <h2 className="text-xl font-semibold text-fg">Sign in to NexGate Console</h2>
          <p className="mt-1 text-fg-muted">Use the administrator account issued by your platform team.</p>

          <div className="mt-6 flex flex-col gap-3" aria-live="polite">
            {endReason === 'expired' ? (
              <InlineAlert tone="warning" title="Your session expired">
                Sessions last as long as the access token. Sign in again to continue.
              </InlineAlert>
            ) : null}
            {endReason === 'invalid' ? (
              <InlineAlert tone="warning" title="You were signed out">
                The server no longer accepts your session. Sign in again to continue.
              </InlineAlert>
            ) : null}
            {failure ? (
              <InlineAlert tone="danger" title={failure.title}>
                {failure.detail}
              </InlineAlert>
            ) : null}
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
            <Field label="Username" htmlFor="username" error={errors.username?.message}>
              <Input id="username" autoComplete="username" autoFocus invalid={Boolean(errors.username)} {...register('username')} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fg-subtle hover:text-fg"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" variant="primary" loading={isSubmitting} className="mt-1 w-full">
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

/** Small schematic of the gateway's policy chain; mirrors the route pipeline view. */
function PipelineSketch() {
  const stages = ['Match path', 'Authenticate', 'Rate limit', 'Idempotency', 'Rewrite', 'Forward'];
  return (
    <ol className="relative mt-10 flex flex-col" aria-label="Gateway request pipeline">
      <span className="absolute top-3 bottom-3 left-[4.5px] w-px bg-navy-700" aria-hidden />
      {stages.map((stage) => (
        <li key={stage} className="relative flex items-center gap-3 py-1.5">
          <span className="size-2.5 shrink-0 rounded-full border-2 border-[#5b92f5] bg-navy-900" aria-hidden />
          <span className="font-mono text-[12.5px] text-navy-200">{stage}</span>
        </li>
      ))}
    </ol>
  );
}

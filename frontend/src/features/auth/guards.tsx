import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { ConsoleRole } from '@/types/api';
import { roleLabel } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { useAuth } from './AuthProvider';

export function homePathFor(role: ConsoleRole): string {
  return role === 'PLATFORM_ADMIN' ? '/platform' : '/tenant';
}

/**
 * UI-only gate. It decides what the console renders; the backend's Spring
 * Security rules remain the actual authorization boundary.
 */
export function RequireRole({ role, children }: { role: ConsoleRole; children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (session.role !== role) {
    return <WrongRole required={role} home={homePathFor(session.role)} />;
  }
  return <>{children}</>;
}

function WrongRole({ required, home }: { required: ConsoleRole; home: string }) {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-full items-center justify-center bg-canvas p-6">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto size-8 text-warning" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold text-fg">This area is for {roleLabel(required).toLowerCase()}s</h1>
        <p className="mt-1.5 text-fg-muted">Your account doesn’t have access to this part of the console.</p>
        <Button variant="primary" className="mt-5" onClick={() => navigate(home, { replace: true })}>
          Go to your overview
        </Button>
      </div>
    </main>
  );
}

export function RootRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? homePathFor(session.role) : '/login'} replace />;
}

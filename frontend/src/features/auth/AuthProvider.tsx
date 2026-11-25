import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionFromLogin, sessionStore, type EndReason, type Session } from '@/lib/session';
import type { LoginRequest } from '@/types/api';
import { login as loginRequest } from './api';

/** Warn this long before the token's `exp` (no refresh endpoint exists). */
export const EXPIRY_WARNING_MS = 2 * 60 * 1000;

interface AuthApi {
  session: Session | null;
  /** Why the previous session ended, shown once on the login page. */
  endReason: EndReason | null;
  expiringSoon: boolean;
  signIn: (request: LoginRequest) => Promise<Session>;
  signOut: () => void;
  clearEndReason: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => sessionStore.get());
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [expiringSoon, setExpiringSoon] = useState(false);

  useEffect(
    () =>
      sessionStore.subscribe((next, reason) => {
        setSession(next);
        if (!next) {
          setExpiringSoon(false);
          // Never keep one user's server data around for the next user.
          queryClient.clear();
          if (reason && reason !== 'logout') setEndReason(reason);
        }
      }),
    [queryClient],
  );

  // Schedule the expiry warning and the hard sign-out at `exp`.
  useEffect(() => {
    if (!session) return;
    const untilExpiry = session.expiresAt - Date.now();
    if (untilExpiry <= 0) {
      sessionStore.end('expired');
      return;
    }
    const timers: number[] = [];
    const untilWarning = untilExpiry - EXPIRY_WARNING_MS;
    if (untilWarning <= 0) setExpiringSoon(true);
    else timers.push(window.setTimeout(() => setExpiringSoon(true), untilWarning));
    // setTimeout caps at ~24.8 days; tokens are far shorter (default 3600 s).
    timers.push(window.setTimeout(() => sessionStore.end('expired'), Math.min(untilExpiry, 2 ** 31 - 1)));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [session]);

  const signIn = useCallback(async (request: LoginRequest) => {
    const response = await loginRequest(request);
    const next = sessionFromLogin(response);
    setEndReason(null);
    setExpiringSoon(false);
    sessionStore.start(next);
    return next;
  }, []);

  const signOut = useCallback(() => sessionStore.end('logout'), []);
  const clearEndReason = useCallback(() => setEndReason(null), []);

  const api = useMemo(
    () => ({ session, endReason, expiringSoon, signIn, signOut, clearEndReason }),
    [session, endReason, expiringSoon, signIn, signOut, clearEndReason],
  );
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Narrowing helper for pages rendered behind RequireRole. */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useSession requires an authenticated route');
  return session;
}

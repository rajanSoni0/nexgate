import type { ConsoleRole, LoginResponse } from '@/types/api';
import { decodeClaims } from './jwt';

/**
 * Session storage policy (agreed): api-management-service has no refresh-token
 * endpoint, so the access token lives in sessionStorage only. It survives a
 * reload, is cleared when the tab closes, and is never logged or rendered.
 */
const STORAGE_KEY = 'nexgate.session';

export interface Session {
  token: string;
  role: ConsoleRole;
  organizationId: number | null;
  username: string;
  issuedAt: number;
  expiresAt: number;
}

export type EndReason = 'logout' | 'expired' | 'invalid';

export class LoginRejectedError extends Error {}

const CONSOLE_ROLES: readonly ConsoleRole[] = ['PLATFORM_ADMIN', 'TENANT_ADMIN'];

function isConsoleRole(value: unknown): value is ConsoleRole {
  return typeof value === 'string' && (CONSOLE_ROLES as readonly string[]).includes(value);
}

/** Build a session from the login response, refusing non-console roles. */
export function sessionFromLogin(response: LoginResponse, now = Date.now()): Session {
  if (response.role === 'GATEWAY_SERVICE') {
    throw new LoginRejectedError(
      'This is a machine-to-machine service account. It cannot sign in to the console.',
    );
  }
  if (!isConsoleRole(response.role)) {
    throw new LoginRejectedError('This account does not have a console role.');
  }
  const claims = decodeClaims(response.token);
  if (!claims) throw new LoginRejectedError('The server returned an unreadable token.');
  if (claims.role && claims.role !== response.role) {
    throw new LoginRejectedError('The token role does not match the login response.');
  }
  if (response.role === 'TENANT_ADMIN' && response.organizationId == null) {
    throw new LoginRejectedError('This tenant administrator is not linked to an organization.');
  }
  const issuedAt = claims.iat ? claims.iat * 1000 : now;
  const expiresAt = claims.exp ? claims.exp * 1000 : now + response.expiresInSeconds * 1000;
  return {
    token: response.token,
    role: response.role,
    organizationId: response.organizationId ?? null,
    username: claims.sub ?? 'unknown',
    issuedAt,
    expiresAt,
  };
}

type Listener = (session: Session | null, reason?: EndReason) => void;

/**
 * Module-level store so the axios interceptors (outside React) and the
 * AuthProvider (inside React) see the same session.
 */
class SessionStore {
  private current: Session | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    this.current = this.read();
  }

  private read(): Session | null {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Session;
      if (!parsed?.token || !isConsoleRole(parsed.role) || typeof parsed.expiresAt !== 'number') {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      if (parsed.expiresAt <= Date.now()) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /** Side-effect free: an expired session reads as null; AuthProvider ends it. */
  get(): Session | null {
    if (this.current && this.current.expiresAt <= Date.now()) return null;
    return this.current;
  }

  token(): string | null {
    return this.get()?.token ?? null;
  }

  start(session: Session) {
    this.current = session;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable (private mode quotas): keep the in-memory session.
    }
    this.emit();
  }

  end(reason: EndReason) {
    if (!this.current) return;
    this.current = null;
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.emit(reason);
  }

  /** Re-read storage (used by tests). */
  reload() {
    this.current = this.read();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(reason?: EndReason) {
    for (const listener of this.listeners) listener(this.current, reason);
  }
}

export const sessionStore = new SessionStore();

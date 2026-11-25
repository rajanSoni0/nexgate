/**
 * Reads (does NOT verify) the payload of the HS256 token issued by
 * api-management-service. Verification is the backend's job; the console only
 * needs `exp` to schedule session expiry and `sub` for display.
 */
export interface NexGateClaims {
  sub?: string;
  role?: string;
  organizationId?: number | string;
  iat?: number;
  exp?: number;
  iss?: string;
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeClaims(token: string): NexGateClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload && typeof payload === 'object' ? (payload as NexGateClaims) : null;
  } catch {
    return null;
  }
}

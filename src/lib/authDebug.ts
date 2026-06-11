// Lightweight in-memory + localStorage recorder for the last auth error.
// Read by /auth-debug. Survives a page reload so failed redirects (OAuth, etc.)
// are still visible after the browser comes back.

const KEY = "cs.lastAuthError";

export interface AuthErrorRecord {
  context: string;          // e.g. "signInWithPassword", "google_oauth", "signUp"
  message: string;
  name?: string;
  status?: number | string;
  code?: string;
  at: string;               // ISO timestamp
  details?: unknown;
}

export function recordAuthError(context: string, error: unknown) {
  try {
    const e = (error ?? {}) as any;
    const rec: AuthErrorRecord = {
      context,
      message: String(e?.message ?? e ?? "Unknown error"),
      name: e?.name,
      status: e?.status,
      code: e?.code,
      at: new Date().toISOString(),
      details: safeDetails(e),
    };
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* ignore — debug only */
  }
}

export function getLastAuthError(): AuthErrorRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthErrorRecord) : null;
  } catch {
    return null;
  }
}

export function clearLastAuthError() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

function safeDetails(e: any) {
  try {
    return JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e ?? {})));
  } catch {
    return undefined;
  }
}

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

/**
 * OAuth/email-link failures come back encoded in the URL (hash or query),
 * e.g. #error=access_denied&error_code=otp_expired&error_description=...
 * Call this once at app boot — BEFORE supabase-js strips the hash — so the
 * failure survives the redirect and shows up on /auth-debug.
 * Returns true if an error was captured.
 */
export function captureRedirectAuthError(): boolean {
  try {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const pick = (k: string) => hashParams.get(k) ?? queryParams.get(k);

    const error = pick("error");
    const errorCode = pick("error_code");
    const errorDescription = pick("error_description");
    if (!error && !errorCode && !errorDescription) return false;

    const rec: AuthErrorRecord = {
      context: "oauth_redirect",
      message: errorDescription?.replace(/\+/g, " ") ?? error ?? "Unknown redirect error",
      name: error ?? undefined,
      code: errorCode ?? undefined,
      at: new Date().toISOString(),
      details: {
        url_path: window.location.pathname,
        error,
        error_code: errorCode,
        error_description: errorDescription,
        provider: pick("provider") ?? undefined,
      },
    };
    localStorage.setItem(KEY, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

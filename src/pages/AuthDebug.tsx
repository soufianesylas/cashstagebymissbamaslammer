import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, RefreshCw, Trash2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { clearLastAuthError, getLastAuthError, type AuthErrorRecord } from "@/lib/authDebug";
import { toast } from "sonner";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
    <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{label}</p>
    <p className="text-xs font-mono text-right break-all max-w-[60%]">{value}</p>
  </div>
);

const Pill = ({ tone, children }: { tone: "ok" | "warn" | "err" | "muted"; children: React.ReactNode }) => {
  const cls =
    tone === "ok" ? "bg-primary/15 text-primary border-primary/30"
    : tone === "warn" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : tone === "err" ? "bg-destructive/15 text-destructive border-destructive/30"
    : "bg-secondary text-muted-foreground border-border";
  return <span className={`inline-block text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

const AuthDebug = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lastError, setLastError] = useState<AuthErrorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: u }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);
    setSession(s.session);
    setUser(u.user);
    setLastError(getLastAuthError());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  const provider =
    (user?.app_metadata as any)?.provider ??
    (user?.identities?.[0] as any)?.provider ??
    "—";
  const providers = (user?.app_metadata as any)?.providers as string[] | undefined;
  const expSec = session?.expires_at;
  const expiresIn = expSec ? Math.round(expSec - Date.now() / 1000) : null;

  const dump = JSON.stringify({ session, user, lastError }, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(dump);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied debug dump");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Auth Debug</p>
          <button onClick={load} className="h-9 w-9 grid place-items-center rounded-full bg-secondary" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Status */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xl">Session</p>
            {session ? <Pill tone="ok">SIGNED IN</Pill> : <Pill tone="warn">SIGNED OUT</Pill>}
          </div>
          <Row label="Provider" value={<Pill tone="muted">{String(provider)}</Pill>} />
          {providers?.length ? <Row label="All providers" value={providers.join(", ")} /> : null}
          <Row label="User ID" value={user?.id ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Email confirmed" value={user?.email_confirmed_at ? "yes" : "no"} />
          <Row label="Created" value={user?.created_at ?? "—"} />
          <Row label="Last sign-in" value={user?.last_sign_in_at ?? "—"} />
          <Row label="Token type" value={session?.token_type ?? "—"} />
          <Row
            label="Expires"
            value={
              expSec
                ? `${new Date(expSec * 1000).toISOString()} (${expiresIn}s)`
                : "—"
            }
          />
          <Row label="Refresh token" value={session?.refresh_token ? "present" : "—"} />
        </section>

        {/* Last error */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xl">Last auth error</p>
            {lastError
              ? <Pill tone="err">{lastError.context}</Pill>
              : <Pill tone="ok">NONE</Pill>}
          </div>
          {lastError ? (
            <>
              <Row label="When" value={new Date(lastError.at).toLocaleString()} />
              <Row label="Message" value={lastError.message} />
              {lastError.name && <Row label="Name" value={lastError.name} />}
              {lastError.code && <Row label="Code" value={String(lastError.code)} />}
              {lastError.status !== undefined && <Row label="Status" value={String(lastError.status)} />}
              {lastError.details ? (
                <details className="mt-3">
                  <summary className="text-[10px] tracking-widest text-muted-foreground cursor-pointer">RAW DETAILS</summary>
                  <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap bg-secondary/40 p-3 rounded-lg max-h-64 overflow-auto">
                    {JSON.stringify(lastError.details, null, 2)}
                  </pre>
                </details>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-destructive"
                onClick={() => { clearLastAuthError(); setLastError(null); toast.success("Cleared"); }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No errors recorded since last clear.</p>
          )}
        </section>

        {/* Actions */}
        <section className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copy dump
          </Button>
          <Button
            variant="destructive"
            onClick={async () => { await supabase.auth.signOut(); toast.success("Signed out"); }}
            disabled={!session}
          >
            Force sign out
          </Button>
        </section>

        <p className="text-center text-[10px] text-muted-foreground">
          This page is for debugging auth issues. Tokens shown only locally — never log or share the dump publicly.
        </p>
      </div>
    </div>
  );
};

export default AuthDebug;

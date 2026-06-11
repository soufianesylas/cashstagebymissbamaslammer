import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dice5, Mail, Lock, User as UserIcon, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { isNativeAndroid, signInWithGoogleNative } from "@/lib/nativeAuth";
import { toast } from "sonner";
import csLogo from "@/assets/cs-logo.png";
import { recordAuthError } from "@/lib/authDebug";

const signUpSchema = z.object({
  artistName: z.string().trim().min(2, "At least 2 characters").max(40),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  is18Plus: z.literal(true, { errorMap: () => ({ message: "You must be 18 or older to battle." }) }),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ artistName: "", email: "", password: "", is18Plus: false });

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { artist_name: parsed.data.artistName, is_18_plus: true },
          },
        });
        if (error) {
          recordAuthError("signUp", error);
          toast.error(error.message.includes("already") ? "Account already exists. Try signing in." : error.message);
          return;
        }
        if (data.user) {
          await supabase.from("profiles").update({ is_18_plus: true }).eq("id", data.user.id);
        }
        toast.success("Welcome to the stage!", { description: "Check your email to confirm your account." });
      } else {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          recordAuthError("signInWithPassword", error);
          toast.error(error.message.includes("Invalid") ? "Wrong email or password." : error.message);
          return;
        }
        toast.success("You're in. Roll the dice.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      // Native Android: Google blocks OAuth in embedded WebViews with
      // `disallowed_useragent`. Route through Chrome Custom Tabs instead.
      if (isNativeAndroid()) {
        await signInWithGoogleNative();
        toast.success("You're in. Roll the dice.");
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/app` });
      if (result.error) {
        recordAuthError("google_oauth", result.error);
        toast.error("Google sign-in failed. Try again.");
        return;
      }
      if (result.redirected) return;
      toast.success("You're in. Roll the dice.");
    } catch (e: any) {
      const msg = `${e?.message ?? ""}`;
      if (!msg.toLowerCase().includes("cancel")) {
        recordAuthError("google_oauth", e);
        toast.error(msg || "Google sign-in failed. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 stage-bg">
      <div className="absolute inset-0 grid-noise opacity-30 pointer-events-none" />
      <div className="absolute -top-20 left-1/4 h-96 w-32 bg-primary/20 blur-3xl animate-spotlight pointer-events-none" />
      <div className="absolute -top-20 right-1/4 h-96 w-32 bg-accent/20 blur-3xl animate-spotlight pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <img src={csLogo} alt="Cash Stage" className="h-12 w-12" />
          <span className="font-display text-3xl tracking-wider">
            CASH <span className="text-gradient-primary">STAGE</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-primary/30 bg-card/80 backdrop-blur-xl p-8">
          <div className="text-center mb-6">
            <h1 className="font-display text-3xl">
              {mode === "signup" ? "JOIN THE STAGE" : "WELCOME BACK"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signup" ? "Real artists. Real bars. Real money." : "Roll the dice and run it up."}
            </p>
          </div>

          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-secondary border border-border hover:border-primary transition-colors font-semibold text-sm disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground tracking-widest">OR EMAIL</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Artist name"
                  value={form.artistName}
                  onChange={(e) => setForm({ ...form, artistName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                placeholder={mode === "signup" ? "Password (8+ chars)" : "Password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm"
                required
              />
            </div>

            {mode === "signup" && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={form.is18Plus}
                  onChange={(e) => setForm({ ...form, is18Plus: e.target.checked })}
                  className="mt-0.5 accent-primary"
                />
                <span>I confirm I am <b>18 or older</b>. No drama — battlers must be adults.</span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform glow-primary disabled:opacity-50"
            >
              <Dice5 className="h-4 w-4" />
              {submitting ? "..." : mode === "signup" ? "CREATE ACCOUNT" : "ENTER STAGE"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            {mode === "signup" ? "Already on the stage?" : "New artist?"}{" "}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-primary font-bold hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 py-2 rounded-full bg-secondary/60 border border-primary/30">
            <ShieldOff className="h-3 w-3 text-primary" />
            <p className="text-[9px] font-bold tracking-widest text-primary">100% HUMAN · NO AI · RECORDED IN-APP</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

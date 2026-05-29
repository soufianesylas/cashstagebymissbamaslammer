/**
 * Security regression tests.
 *
 * These tests exercise the live backend with the anon (publishable) key to
 * verify that the most important authorization rules still hold after any
 * code or migration change. They are intentionally read-only and side-effect
 * free except for INSERT attempts that we EXPECT to fail.
 *
 * If VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not present (e.g.
 * external contributors / forks running CI without secrets) the suite is
 * skipped instead of failing — same pattern as the linter gate.
 *
 * Add a new case here every time we tighten an RLS rule so future changes
 * cannot silently regress it.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const d = URL && KEY ? describe : describe.skip;

d("security: anonymous client authorization rules", () => {
  const anon = createClient(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Tables that must NEVER be readable by anonymous clients ----------

  const ANON_DENIED_READ = [
    "user_roles",
    "subscriptions",
    "wallets",
    "judging_panel",
    "judging_scores",
    "track_scores",
    "contest_votes",
    "track_boosts",
    "track_reports",
    "moderation_actions",
    "chat_messages",
  ] as const;

  it.each(ANON_DENIED_READ)(
    "anon cannot read sensitive table: %s",
    async (table) => {
      const { data, error } = await anon.from(table as any).select("*").limit(1);
      // Either RLS returns an empty set (no rows visible) or an explicit
      // permission error. Both are acceptable; what we forbid is leaked rows.
      if (error) {
        expect(error.code === "42501" || error.message.toLowerCase().includes("permission"))
          .toBe(true);
      } else {
        expect(Array.isArray(data)).toBe(true);
        expect(data!.length).toBe(0);
      }
    }
  );

  // --- Tables that ARE intentionally publicly readable ------------------

  // NOTE: `tracks` is intentionally NOT in this list. Its SELECT policy calls
  // public.has_role(), whose EXECUTE was revoked from anon in the SECURITY
  // DEFINER lockdown migration. Anonymous reads of tracks therefore fail
  // with "permission denied for function has_role" — that is the current,
  // intentional posture. If we ever re-open public track browsing, restore
  // the row here and add a smoke read.
  const ANON_ALLOWED_READ = [
    "profiles",
    "crews",
    "daily_contests",
    "weekly_contests",
    "weekly_contest_entries",
    "contest_entries",
    "judging_sessions",
  ] as const;

  it.each(ANON_ALLOWED_READ)(
    "anon can read public table without error: %s",
    async (table) => {
      const { error } = await anon.from(table as any).select("id").limit(1);
      expect(error).toBeNull();
    }
  );

  // --- Writes that must be rejected for anon ----------------------------

  it("anon cannot insert into user_roles (privilege escalation guard)", async () => {
    const { error } = await anon.from("user_roles" as any).insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    });
    expect(error).not.toBeNull();
  });

  it("anon cannot insert into subscriptions (tier escalation guard)", async () => {
    const { error } = await anon.from("subscriptions" as any).insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      tier: "vip",
    });
    expect(error).not.toBeNull();
  });

  it("anon cannot insert into wallets (balance tampering guard)", async () => {
    const { error } = await anon.from("wallets" as any).insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      csb_balance: 999999,
    });
    expect(error).not.toBeNull();
  });

  it("anon cannot insert into track_scores (vote stuffing guard)", async () => {
    const { error } = await anon.from("track_scores" as any).insert({
      track_id: "00000000-0000-0000-0000-000000000000",
      judge_id: "00000000-0000-0000-0000-000000000000",
      score: 10,
    });
    expect(error).not.toBeNull();
  });

  it("anon cannot insert into contest_votes (anonymous voter still requires auth)", async () => {
    const { error } = await anon.from("contest_votes" as any).insert({
      contest_id: "00000000-0000-0000-0000-000000000000",
      entry_id: "00000000-0000-0000-0000-000000000000",
      voter_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).not.toBeNull();
  });

  it("anon cannot insert tracks (must be authenticated owner)", async () => {
    const { error } = await anon.from("tracks").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      title: "rls-regression-should-fail",
      audio_path: "x",
    });
    expect(error).not.toBeNull();
  });

  // --- SECURITY DEFINER RPC surface -------------------------------------
  // Only the allowlisted RPCs in scripts/lint-security-gate.mjs should be
  // callable. Spot-check that anon cannot call admin-only ones.

  it("anon cannot open_todays_contest (admin/mod gated)", async () => {
    const { error } = await anon.rpc("open_todays_contest" as any);
    // Either denied at API layer or rejected inside the function body.
    expect(error).not.toBeNull();
  });

  it("anon cannot close_expired_contests (admin/mod gated)", async () => {
    const { error } = await anon.rpc("close_expired_contests" as any);
    expect(error).not.toBeNull();
  });

  it("anon cannot submit_track_score (auth required)", async () => {
    const { error } = await anon.rpc("submit_track_score" as any, {
      _track_id: "00000000-0000-0000-0000-000000000000",
      _score: 10,
    });
    expect(error).not.toBeNull();
  });
});

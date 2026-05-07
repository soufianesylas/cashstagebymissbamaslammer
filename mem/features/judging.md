---
name: judging-anonymity
description: Anonymity rules for Judging Sessions (JS), questionnaire, daily caps, and CSB rewards
type: feature
---
Judging Sessions (JS) — anonymous-by-default scoring.

- Artists NEVER see judge identity for scores against or for them. Only aggregated tallies (count, average) are exposed publicly.
- Judges may see their own scores/answers; admins see all (for moderation).
- Each judge can submit up to 250 JS scores per UTC day. Cap enforced server-side via `validate_track_score` trigger.
- A track must be fully listened (>=99% playback) before its 1–10 score and questionnaire are accepted.
- Each fully-listened track pays the judge 1 CSB (= $1 in-app value). Paid via `pay_listen_reward` BEFORE INSERT trigger on `track_scores`. `reward_paid` flag prevents double-pay.
- Post-track questionnaire (all optional except score):
  1. Feature worthy? (yes/no → `feature_worthy`)
  2. Favorite bars or line? (text, max 500 → `favorite_bars`)
  3. Needs improvement? (text, max 500 → `needs_improvement`)
- Boosted tracks (`track_boosts.votes_remaining > 0`) appear first in the JS queue.

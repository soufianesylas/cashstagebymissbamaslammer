## Goal

Replace the current LiveApp Home tab with a styled adaptation of the pasted `CashStageGameMockup` layout — but wired to real data and existing routes, themed with the neon Cash Stage tokens.

## What changes

**File: `src/pages/LiveApp.tsx`** — rewrite `HomeTab` only. No new routes, no DB changes, no business logic touched.

### New Home tab layout

1. **Header strip** — keep current "ROLL THE DICE" hero (signature element, already wired to `rollTheDice`). Subtitle changes to "No Drama. Just Battles." per mockup tagline.

2. **4-card action grid** (replaces the 7-button mishmash currently below the hero):
   - **Roll & Match** → `Dice5` icon → calls `onRoll` (existing dice roll)
   - **Solo Battle** → `Mic` icon → `navigate('/studio')`
   - **Collab** → `Users` icon → `navigate('/crews')`
   - **Weekly Contest** → `Trophy` icon → `navigate('/weekly')`
   - Each card: neon border, glow on hover, semantic tokens (`bg-card`, `border-primary/30`, `text-primary` accents), `font-display` labels, primary button.

3. **Tabs section** (`Tabs` from `@/components/ui/tabs`) with 4 triggers: Feed / Battles / Crews / Chat.
   - **Feed** → maps over first 3 entries of existing `feed` state → shows title, artist_name, mode badge. Tap row → switches main `tab` to `"feed"` for full list.
   - **Battles** → filters `feed` where `mode === 'battle'` (top 3). "JOIN" button → `navigate('/studio')`. "WATCH" button on each → switches to feed tab.
   - **Crews** → fetches top crews from `crews` table (id, name, tag, member count via `crew_members` count) on mount. Tap → `navigate('/crews')`.
   - **Chat** → fetches public `chatrooms` (kind='public', limit 4). "ENTER" → `navigate('/chat/' + room.id)`.
   - All cards themed (bg-card, border-border, hover:border-primary/40), Badges use existing `Badge` component with `variant="secondary"` + colored accent classes.

4. **Safety footer** — keep existing "100% HUMAN · NO AI" badge, add second line below: `<Shield /> Block = No access to your content or voting`.

5. **Stats row** (Balance / My Tracks / Feed) stays at bottom — still useful glance info.

### Styling rules

- All colors via design tokens (no raw hex/`text-white`).
- Reuse `font-display`, `text-glow`, `glow-primary`, `bg-card`, `border-primary/30`, `text-primary`, `text-accent`, `text-battle-blue`.
- Cards use `rounded-2xl`/`rounded-3xl` and `transition-all hover:border-primary/40` to match existing TrackRow look.
- Tabs styled via existing shadcn `Tabs` (already themed) + add `bg-secondary/60 border border-border` wrapper.

### Data additions in LiveApp

Add two small fetches in the existing load effect:
- `crews` (id, name, tag) limit 4 ordered by created_at desc
- `chatrooms` where kind='public' limit 4

Pass into `HomeTab` as props alongside existing balance/myCount/feedCount/feed.

## Out of scope

- No changes to /studio, /crews, /chat, /weekly destinations.
- No DB migrations or RLS changes.
- No changes to FeedTab, StudioTab, LeaderboardTab, WalletTab.
- The pasted mockup's `framer-motion` import is dropped (not needed; keep CSS-driven `animate-spotlight`/`animate-dice-roll` already in project).

## Acceptance

- Home tab renders 4 action cards + 4-tab inner panel + safety footer in 411px viewport without overflow.
- Each button navigates to the correct existing route.
- Feed/Battles inner tabs show real seeded tracks. Crews/Chat inner tabs show real rows from DB.
- Visual matches neon Cash Stage theme (no light shadcn defaults).
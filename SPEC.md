# Rackt MVP Spec (Expo + Supabase)
Owner: you
Build agent: Codex
Goal: Ship a clean MVP with Playtomic-inspired per-sport ratings + confirmed match results.

---

## Product vision (MVP)
Rackt helps players:
1) Add friends
2) Report matches (opponent confirms)
3) Track a per-sport level (0.0–7.0) with reliability %, inspired by Playtomic behavior:
   - low reliability = bigger changes
   - high reliability = stable rating
4) Allow users to enter their existing level on onboarding (“import”) and calibrate from there.

---

## Tech constraints
- Mobile: Expo (Expo Router), TypeScript
- Backend: Supabase (Postgres, Auth, RLS)
- No local setup required for user
- Keep CI green
- No new libs unless required by a step

---

## Repo paths
- Mobile app: `apps/mobile`
- Supabase client: `apps/mobile/lib/supabase.ts`
- Auth screens exist:
  - `apps/mobile/app/(auth)/sign-in.tsx`
  - `apps/mobile/app/(auth)/sign-up.tsx`
- Tabs exist:
  - `apps/mobile/app/(tabs)/index.tsx`
  - `apps/mobile/app/(tabs)/profile.tsx`
  - `apps/mobile/app/(tabs)/settings.tsx`

---

## Global UX rules
- Every network action has loading state + error alert
- Never expose secrets in repo
- Always handle empty states (no friends, no matches, etc.)
- Keep screens simple and usable; no fancy UI needed

---

# DATA MODEL (MVP)

## Existing
### profiles (already exists)
- id (uuid, FK auth.users)
- username, full_name, avatar_url, timestamps
- RLS: user can insert/update own; authenticated can read

## New tables (MVP)

### sport_ratings
Per-sport rating like Playtomic-style “level”.
Fields:
- user_id (uuid, FK auth.users)
- sport (text) e.g. "padel", "tennis", "badminton", "table_tennis"
- level (numeric) range 0.0–7.0
- reliability (int) 0–100
- source (text) one of: "system" | "user_import" | "questionnaire"
- matches_competitive (int)
- created_at, updated_at
Primary key: (user_id, sport)

RLS:
- user can read/write own rows
- authenticated can read others (MVP; later can restrict by privacy)

### friends
Simple mutual friendship table.
Fields:
- user_a (uuid)
- user_b (uuid)
- created_at
Rules:
- enforce user_a < user_b ordering to avoid duplicates
Unique: (user_a, user_b)
RLS:
- only participants (user_a or user_b) can read
- insert only via accepting requests (MVP can allow insert by either participant)

### friend_requests
Fields:
- id (uuid pk)
- from_user (uuid)
- to_user (uuid)
- status (text): "pending" | "accepted" | "declined" | "cancelled"
- created_at, updated_at
Rules:
- from_user != to_user
- only one pending request per pair
RLS:
- sender/receiver can read
- sender can insert + cancel
- receiver can accept/decline

### matches
Fields:
- id (uuid pk)
- sport (text)
- is_ranked (bool)
- status (text): "pending" | "confirmed" | "disputed"
- reported_by (uuid)
- played_at (timestamptz)
- created_at
RLS:
- participants can read (via match_players)
- participants can insert a match (must include themselves)

### match_players
Fields:
- match_id (uuid)
- user_id (uuid)
- side (int) 1 or 2
Primary key: (match_id, user_id)
RLS:
- participants can read
- insert only as part of match creation (by reporter)

### match_confirmations
Fields:
- match_id (uuid)
- user_id (uuid)
- status (text): "pending" | "confirmed" | "disputed"
- updated_at
Primary key: (match_id, user_id)
RLS:
- row owner (user_id) can update their status
- participants can read all confirmations for that match

### sport_rating_history
Fields:
- id (uuid pk)
- user_id, sport
- match_id (uuid)
- level_before, level_after, delta
- reliability_after (int)
- created_at
RLS:
- user can read own; authenticated can read others (MVP)

---

# RACKTRANK RULES (MVP)
- Rating per sport.
- Display: 0.0–7.0
- Reliability: 0–100
- Only CONFIRMED ranked matches update rating.
- Starting defaults per chosen sport:
  - level: 3.0
  - reliability: 20
  - source: "system"

On “import existing level”:
- user sets level (0.0–7.0)
- set source="user_import"
- reliability default 30 (unless they explicitly set it)

Update algorithm (MVP, simple + stable):
- Compute expected win probability using a logistic curve from level difference.
- delta_base = K * (actual - expected) where actual=1 for win, 0 for loss
- reliability_factor = 1.25 when reliability < 40, 1.0 when 40–70, 0.75 when >70
- delta = delta_base * reliability_factor
- clamp delta to [-0.35, +0.35] per match
- new_level = clamp(old_level + delta, 0.0, 7.0)
- reliability increases +3 each ranked confirmed match, capped at 100
- store sport_rating_history row

(We can tune constants later.)

---

# APP SCREENS (MVP)

## Auth + routing
- Root index.tsx routes:
  - if session exists -> /(tabs)
  - else -> /(auth)/sign-in
- Reset password screen

## Onboarding
- If user has no profile row or no username:
  - go to onboarding flow:
    - pick username (unique)
    - choose sports
    - for each sport set starting level:
      - default 3.0 OR import existing level

## Tabs
### Home (/(tabs)/index)
- show per-sport cards:
  - sport name
  - level (0.0–7.0)
  - reliability %
- quick actions:
  - “Report match”
  - “Friends”

### Friends
- search by username
- send request
- requests inbox (accept/decline)
- list friends

### Matches
- report match (singles v1)
  - choose sport
  - choose opponent (friend)
  - choose winner/score simple input
  - ranked toggle
- pending confirmations list
- history list
- match detail screen:
  - confirm/dispute if you’re the opponent

### Profile
- show username, full name, avatar placeholder
- edit username/full_name
- show ratings list

### Settings
- sign out
- delete account (in-app)

---

# BUILD PLAN (ONE PR PER STEP)
Each step must:
- include minimal code
- include UI + Supabase calls needed for that step
- update/add SQL in `supabase/migrations/*.sql` (create folder if needed)
- keep CI green

## Step 1 — Auth gate
- Add `apps/mobile/app/index.tsx` that routes based on session and listens to auth changes.

## Step 2 — Reset password
- Add `(auth)/reset-password.tsx`
- add link from sign-in to reset
- call supabase.auth.resetPasswordForEmail()
- (optional) handle update password deep link later

## Step 3 — Onboarding + username uniqueness
- Add onboarding route group `(onboarding)`
- Create "Create Profile" screen:
  - username
  - full_name optional
  - choose sports
  - starting levels (import option)
- Implement username uniqueness check against profiles table.
- Ensure profile row exists after signup/login.

## Step 4 — sport_ratings + history tables + RLS
- Add migrations for sport_ratings + sport_rating_history + policies.
- On onboarding completion, upsert sport_ratings rows per selected sport.

## Step 5 — Friends tables + UI
- Add migrations for friend_requests + friends + RLS.
- Implement screens: search, requests, friends list.

## Step 6 — Matches tables + UI
- Add migrations for matches, match_players, match_confirmations + RLS.
- Implement:
  - report match (create match + players + confirmations)
  - pending confirmations
  - confirm/dispute actions
  - history list

## Step 7 — RacktRank update on confirm
- Add a server-side SQL function (or edge function later) that:
  - when match status becomes confirmed and ranked:
    - updates sport_ratings for both players
    - inserts sport_rating_history rows
- App: on confirm, call RPC/function to apply updates.

## Step 8 — Settings: Sign out + Delete account
- Sign out button wired to supabase.auth.signOut()
- Delete account flow:
  - deletes/cleans user-owned rows (ratings, requests, friendships, match participation policy)
  - then deletes profile
  - then deletes auth user (note: may require admin/edge function; MVP can request deletion via support if needed, but prefer in-app if possible)

Acceptance for MVP:
- New user can sign up, set username + sports + starting levels, add friend, report match, confirm match, see ratings update.

---

# CODEx RULES
When implementing a step:
- Implement ONLY that step
- Do not refactor unrelated code
- Update or add minimal tests if present
- After changes:
  - summarize what you did
  - list files changed
  - tell how to manually verify

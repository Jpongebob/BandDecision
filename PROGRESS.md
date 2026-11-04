# BandDecision Web Progress

The requested root files `SPEC.md`, `AGENTS.md`, and `CODEX_TASK.md` were not present. I read the supplied equivalents `banddecision_web_SPEC.md`, `banddecision_web_AGENTS.md`, and `banddecision_web_CODEX_TASK.md` in full, then built the new web app under `banddecision-web/`. The previous mobile/Expo app was not changed.

## Phases 0-7

| Phase | Implemented | Remaining / status |
|---|---|---|
| 0 Database, RLS, server functions | Supabase migration, core tables/indexes, RLS, restricted RPCs, pgTAP security test | Migration and DB tests BLOCKED: no Supabase project, CLI, Docker, or database |
| 1 App and auth | Next.js App Router, strict TypeScript, Tailwind, shadcn-style shared UI, Supabase SSR, signup/login/logout/password reset/protected routes | Local static checks pass. Real email auth BLOCKED |
| 2 Band and invites | Create band, 7-day single-use invite, variable membership/same part, leader permissions, skill/part changes, transfer/leave/remove | UI/actions/RPC implemented; DB integration BLOCKED |
| 3 Round and unavailable dates | 60-day participant snapshot, submission states, native date picker and quick date entry, per-date reasons, review/range acknowledgment | Calendar selection plus editable reason list implemented; DB verification BLOCKED |
| 4 Date recommendations | All-submitted date ranking, attendee counts/reasons, tie handling, show all | Recommendation unit tests pass; DB verification BLOCKED |
| 5 Song voting | Song/part difficulty, recommendations, yes/no and reasons, tally/scoring | UI/actions/RPC and calculation tests implemented; DB verification BLOCKED |
| 6 Final confirmation | Leader confirmation, round version/current-state checks, plan/member/song snapshots, refresh subscription | Server functions/UI implemented; concurrency/rollback/Realtime DB verification BLOCKED |
| 7 Responsive operations | Desktop/mobile navigation, profile, error/empty states, account deletion request, README/deploy guide | Browser viewport checks not run. Deletion request only; Auth deletion/anonymization worker not implemented |

## v3.1 candidate song permission update

- Any active band member can add candidate songs and set/edit part difficulty in their own band. Member management and final plan confirmation remain leader-only; availability and votes remain self-only.
- Added `202611050001_member_song_permissions.sql`: same-band RLS policies, member-checked RPCs, difficulty actor/time/version fields, serialized expected-version edits, stale-write rejection, and active-round version refresh. Confirmed plan snapshots are not written by difficulty edits.
- Updated song forms to show these controls to all members, include the current difficulty version, and display last editor/time. Recommendation code reads the latest difficulty records.
- Added pgTAP member-permission coverage for ordinary member add/edit, editing a leader-created song, actor/time/version, stale-write and cross-band rejection, restricted direct table writes, and confirmed snapshot preservation. Added a unit test showing updated difficulty changes later recommendation score.
- Verification: lint/typecheck pass; recommendation and date unit suites pass. pgTAP remains unexecuted because Supabase CLI/DB are unavailable.

## Tests actually run

| Check | Result |
|---|---|
| `npm.cmd run lint` | PASS, no warnings/errors |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS, 2 files / 15 tests (includes edited-difficulty scoring) |
| `npm.cmd run build` | PASS, optimized build generated all 20 static pages/routes |
| Production route smoke check | PASS, `/`, `/login`, `/signup`, `/dashboard`, `/schedule`, `/schedule/recommendations`, `/songs`, `/songs/recommendations`, `/plans`, `/settings/band` returned HTTP 200 |
| Supabase migration/pgTAP/Realtime | BLOCKED: credentials, CLI, Docker, and DB unavailable |
| Deployment | BLOCKED: Vercel account/domain/permission unavailable |

The pgTAP test is written but was not executed, so DB policies and RPC integration are not verified. Configure Supabase URL/anon key, apply the migration, and verify signup, RLS, RPC, and Realtime. Public deployment and browser/device responsive checks remain outstanding.

## Deployment readiness review (2026-11-04)

- Rewrote `DEPLOYMENT.md` with the Supabase migration/auth callback and Vercel project setup steps; added `NEXT_PUBLIC_SITE_URL` to `.env.example`.
- Preview email callbacks and invite links now fall back to Vercel's per-deployment `VERCEL_URL` when `NEXT_PUBLIC_SITE_URL` is unset; Production uses the explicitly configured canonical URL.
- Confirmed the repository has a GitHub remote, but no Vercel CLI/project link, Vercel/Supabase environment credentials, Supabase CLI, psql, or Docker. No live migration or deployment was attempted because this checkout cannot authenticate to either provider.
- The connected Sites account contains one unrelated project (`?대떇肄?硫붿씤`); it has no BandDecision source or runtime configuration and was left unchanged. No matching hosting project is available to attach to this checkout.
- Reviewed the new pgTAP fixtures and corrected the cross-band difficulty test to target a song outside the caller's band. The test file declares 20 assertions; it remains unexecuted until a Supabase local/remote test DB is available.
- Latest code checks: `npm run lint`, `npm run typecheck`, and `npm test` (15 passed) succeeded; production build succeeded and generated all 20 routes.

## Vercel prerender fix and local preview (2026-11-04)

- Vercel's build failed while prerendering `/dashboard`: authenticated protected routes read Supabase request cookies while Next.js Cache Components were enabled.
- Added `export const instant = false` to the protected route layout so authenticated pages can use request-time data.
- Verification actually run after the change: `npm.cmd run build` PASS (all 20 pages/routes generated); production smoke requests to `/`, `/login`, `/signup`, `/dashboard` all returned HTTP 200.
- Local production preview is running at `http://localhost:3000`.
- Not verified: authenticated Supabase flows and remote Vercel redeployment. `.env.local` is absent in this checkout; push the layout fix to the connected GitHub branch to trigger a new Vercel build.


# Bug audit — 2026-11-05

## Reproduced and corrected

| Area | Reproduction before fix | Correction |
|---|---|---|
| Existing date list + quick input '없음' | Previous dates remained in hidden submitted JSON | Explicit none clears the draft and outside-round acknowledgment |
| Native calendar past date | Past date entered the list despite input min attribute | Validate against today before changing rows |
| Refreshed song difficulty | Select still showed 2 while expected_version already advanced to 2 for saved difficulty 4 | Version-keyed form remount keeps value and expected version aligned |
| Refreshed personal vote | Choice/reason retained previous uncontrolled defaults | Key vote form by round, saved choice and saved reason |
| New round with unsaved vote draft | Old round draft carried into new round hidden ID | Include round ID in vote form identity |
| New member outside frozen round roster | Voting controls were offered; schedule incorrectly said submitted | Read-only round notice, no own edit controls until a new round; song/difficulty permissions remain |
| Partial database read errors | Missing dates/participants/votes treated as empty; skill silently became 3 | Fail closed and show retry/home error boundary; no guessed recommendation or editable empty date list |
| Plan/home query failures | Existing plan looked absent; pending count looked complete | Check query errors instead of inventing empty/default states |
| Malformed JSON reason via RPC | Numbers/booleans/objects/arrays converted to text and replaced existing dates | Migration 008 requires JSON string reasons before writes |
| Null vote choice via RPC | Database NOT NULL error surfaced instead of expected validation error | Migration 008 explicitly returns INVALID_INPUT; prior vote preserved |

Initial targeted run: 12/12 new UI/service tests failed before fixes and then passed.
Page-query run: 7/8 failed before page corrections; date-recommendation error checks expanded the suite.
Round/new-member run: 3/3 additional boundary cases failed before corrections and then passed.
DB input-edge run: 6/11 failed before 008; all 11 now pass, including preservation of old dates/votes.

## Executed evidence
- Full unit/action/component/server-page tests: 23 files / 139 tests PASS.
- PostgreSQL/PGlite/pgTAP: 9 migrations / 232 assertions PASS.
- Standalone typecheck PASS; lint PASS; final production build PASS with 19 routes.
- Existing ordinary-member restrictions, cross-band RLS, canonical PIN identity, stale difficulty checks, finalization version checks and snapshot tests continue passing.
- Real Chrome headless: login rendered at 1440px; test-band screen measured at 390px and 320px with document scrollWidth equal to viewport width. Initial CLI screenshot clipping was a capture viewport artifact; comparative metrics did not reproduce a layout bug, so speculative form/input CSS changes were reverted.
- Real Chrome HTTP checks: /login/email, /signup, /reset-password, /join/retired-token and /auth/callback all 404.
- Chrome profiles were isolated from the user's normal browser. No real passwords/tokens were used.

## Limits
There is no configured local Supabase environment or connected hosted provider. Chrome checks cover public rendering only, not live authenticated navigation. Actual GoTrue, PostgREST, WebSocket, real multiple-device editing, true concurrent database connections, deployed latency and hosted migration execution remain unverified. Single-connection SQL tests and React rerenders do not prove real concurrency. Account deletion still records a request; the deletion/anonymization worker is not implemented.

## Apply
If 007 and earlier migrations succeeded, run ONLY new 202611050008_strict_submission_inputs.sql and redeploy the app. Apply any missing older migrations in order, each once; never rerun previously successful historical scripts or production test fixtures. No existing band/member/plan data is reset. See PROGRESS.md and TEST_CASES.md.

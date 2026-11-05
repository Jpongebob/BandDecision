> Current v4 contract is continuous planning. The older AC table below records historical behavior through 010; frozen-roster/round-start/preview-required cases are retired. Current results are in the 011 section and CONTINUOUS_PLANNING.md.

# QA report — 2026-11-05

PASS means only the local scope named below. It does not certify deployed Auth, PostgREST, Realtime or device behavior. Historical PROGRESS entries describe earlier runs; this report reflects the latest run.

- lint, standalone typecheck, 113 tests in 17 files, 163 PostgreSQL/pgTAP assertions, and 23-route production build: PASS.
- Isolated PGlite with minimal Supabase auth fixtures and real PostgreSQL RLS/functions. One connection only.
- Local HTTP: /, /login, /bands/new and both recommendations routes returned 200 without configured Supabase. This tests rendering/configuration fallback only.
- Production dependency audit: zero findings; full development audit: 16 Moderate remaining after removing two Critical findings via Vitest update.
- M_ID source not found locally; supplied stack lacks full URL. Hosted latency, real viewport checks and account-deletion worker remain unverified/unimplemented.

| Acceptance | Result | Executed evidence / limit |
|---|---|---|
| AC01 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC02 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC03 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC04 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC05 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC06 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC07 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC08 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC09 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC10 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC11 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC12 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC13 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC14 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC15 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC16 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC17 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC18 | PASS | Executed date-parser tests; 21 also invalid batch rollback in workflow SQL. |
| AC19 | PASS | Executed date-parser tests; 21 also invalid batch rollback in workflow SQL. |
| AC20 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC21 | PASS | Executed date-parser tests; 21 also invalid batch rollback in workflow SQL. |
| AC22 | PASS | Executed date-parser tests; 21 also invalid batch rollback in workflow SQL. |
| AC23 | PASS | Executed date-parser tests; 21 also invalid batch rollback in workflow SQL. |
| AC24 | PASS | Executed parser outside-round warning + SQL acknowledgment/retention tests. |
| AC25 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC26 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC27 | BLOCKED | Invalid SQL batch rollback passes; browser cancel interaction not exercised. |
| AC28 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC29 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC30 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC31 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC32 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC33 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC34 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC35 | PASS | Executed partial-attendance preview/reset and SQL acknowledgment tests. |
| AC36 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC37 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC38 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC39 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC40 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC41 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC42 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC43 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC44 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC45 | PASS | Executed deterministic recommendation tests; no browser claim. |
| AC46 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC47 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC48 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC49 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC50 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC51 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC52 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC53 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC54 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC55 | BLOCKED | Live end-to-end/browser evidence not available. |
| AC56 | PASS | 20 local JS chunks scanned: no concrete sb_secret_ key literals. No configured secret-injection test. |
| AC57 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC58 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |
| AC59 | BLOCKED | Sequential expected-version stale rejection and snapshot preservation pass; two real concurrent clients not tested. |
| AC60 | PASS | Executed local PostgreSQL pgTAP: band-code/security/member-song/workflow/leadership suites; hosted behavior unverified. |

Additional handoff coverage: 37 SQL assertions and form/action tests cover self/cross-band/inactive/no-PIN rejection, expired admin, PIN distinction, owner-role consistency, former-leader denial, elevation reset and retained snapshots/sessions. Availability workflow has 43 SQL assertions, including the reproduced ambiguous-variable regression.

Rollout: apply only migration 202611050004 after prior files, then redeploy the application. See DEPLOYMENT.md. No production DB or deployment was modified in this run.

## Latest update: immediate leader administration
Supersedes the earlier elevation prerequisite only; acceptance scope/hosted limitations above remain. Local run: 18 files / 115 tests; 6 migrations / 175 SQL assertions. leader_access.test.sql adds 12 assertions for management and finalization with admin_until=null, role/band restrictions and personal-session expiry. UI tests show leader tools when legacy admin_unlocked=false and no unlock form; members get no leader tools. Previous handoff tests now expect new leaders to administer immediately and obsolete administrator elevation expiry to have no authorization effect. PIN rotation at handoff remains backward compatible.

## Latest update: retired email routes and RPCs
Current run: 17 files / 102 tests, 7 migrations / 191 SQL assertions. Dedicated email callback/return-path/login tests were removed along with their features; code-only login and reusable-invite UI tests added. retired_email.test.sql asserts PUBLIC-derived anon/authenticated permissions are revoked, direct legacy calls fail with 42501, private token rows cannot be selected, and all four current code/PIN onboarding RPCs remain enabled. AC01/03/06–09 email/token-specific requirements above are now retired by v3.5; they are not claimed as passed. Provider Email disabling, real Auth/Realtime and deployment remain unverified.

## Latest update: identity hydration and test band
111 tests in 19 files; 221 SQL assertions across 8 migrations. Identity unit tests prove no extra membership/band from() calls and reject other-actor/mismatched contexts. Test-band suite has 30 real PostgreSQL assertions: creator leadership, four scenarios, Korean part-key matching, A finalization, D denial preserving prior plan, existing-band isolation and complete rollback after injected late failure. Existing getUser-before-RPC auth test still passes. Build: 19 routes; lint/typecheck passed. Hosted Auth, browser navigation latency, WebSocket and real devices remain unverified. Follow TEST_CASES.md after migration 007 + deployment.

## Latest update: reproduced bugs / strict inputs (008)
139 tests across 23 files and 232 SQL assertions across 9 migrations passed; see BUG_AUDIT.md for pre-fix failing results and post-fix evidence. Availability-none/past dates, stale difficulty/version pairing, saved/new-round votes, excluded new members, read failures and malformed RPC inputs are covered. Public Chrome rendering at desktop/mobile widths and retired route 404s were executed; authenticated viewport/Realtime/concurrent connections remain unverified. Account deletion still requires an unimplemented worker. No claim of zero remaining bugs is made.

## Five-member fixture update (009)
47 new PostgreSQL assertions pass; total 279 across 10 migrations. Tests cover real table membership for five, normal password-grant/PIN registration, duplicate guitar/different skills, A/B/C/D vote conditions, all-five/3-of-5 finalization, ordinary-profile login and denied administration. SDK tests verify isolated Auth creation, resume and provider-limit stop, but no hosted API calls were performed. The initial record alias error was reproduced and corrected before final SQL PASS. TEST_CASES.md now replaces the earlier one-person guide.


## v3.9 local mobile workflow and multi-plan update
AC50 now means retaining up to five independently confirmed plans, denying a sixth and allowing explicit current-leader deletion. Local SQL/UI/action tests pass under the new contract; older replacement-one behavior is retired. Final regression results: 163 unit/component/action tests, 300 SQL assertions across 11 migrations, 157 actual Chrome mobile checks, lint/type/build pass. See MOBILE_QA_REPORT.md for exact sizes, successful check list, reproduced defects and the Auth/REST substitute boundary. Physical phones, Safari, native keyboard, hosted Auth/REST/Realtime, real concurrent connections, deployment and production latency are NOT verified by these results.


## 011 current contract
| Case | Local result |
|---|---|
| CP01 Saved dates listed once, add/edit/delete without replacing others | PASS UI + SQL + Chrome |
| CP02 Date-only confirmation without preview | PASS UI + SQL + Chrome |
| CP03 Same-plan date/song edit and song removal | PASS UI + SQL + Chrome |
| CP04 Five-plan cap with editing at capacity | PASS SQL + Chrome |
| CP05 Current membership immediately changes attendance and vote eligibility | PASS SQL + Chrome |
| CP06 Own-only dates/votes; leader-only plans; cross-band denial | PASS SQL + actions/UI |
| CP07 Planning and plan stale-version rejection | PASS SQL + actions |
| CP08 Existing dates/latest votes/plan snapshots survive upgrade | PASS seeded 010 -> 011 SQL |
| CP09 Mobile width/long text and navigation | PASS Chrome emulation |
Current unit/component/action tests: 182 PASS. Current SQL assertions: 66 PASS. Historical contract through 010: 300 PASS. Current Chrome full run: 100 checks PASS, zero uncaught JS exceptions. Real Auth/PostgREST/Realtime/phones/parallel connections/hosted latency remain unverified. Build/lint/type final results are recorded in PROGRESS.md after completion.


## 2026-11-05 Loading performance follow-up (012)
- Added a canonical-actor, active-member-only `band_attendance_context()` RPC and active-roster/song indexes in `202611050012_loading_performance.sql`. Schedule and date recommendations no longer retrieve song difficulties/votes. Home reads only member count and plan summary fields; band settings reuses its already-loaded roster.
- Server Auth verification is request-local and shared. Schedule/date identity and attendance reads run concurrently only AFTER verified `auth.getUser()` succeeds; invalid Auth cannot start private RPCs. Existing canonical identity, session expiry, RLS and leader checks remain. Cross-request user caching was not introduced.
- Replaced `connection()` with installed Next 16.4.5 `io()` to exclude SDK clock reads from prerendering without a navigation-only I/O boundary. This does not prefetch or cache private account data across visitors. Proxy `getClaims()` remains unchanged.
- Realtime refresh subscribes to the current band's revision row instead of every changed child row/all bands. Existing visibility/focus refresh and burst coalescing remain. Hosted Realtime delivery is unverified.
- Validation: lint and typecheck PASS; 29 files / 192 unit/component/action tests PASS; 72 CURRENT continuous-planning SQL assertions PASS, including six new payload-equivalence/authorization/index assertions. Separate HISTORICAL through-010 scope: 300 PASS. Actual Chrome focused workflow: 63 checks PASS, zero uncaught JS exceptions, including normal-member restrictions, saved-date edits, automatic date choices, date-only plans, five-plan capacity, vote changes and new-member roster updates. Auth/REST use disposable localhost substitutes with real SQL/RLS, not hosted Supabase.
- Controlled production-build Chrome benchmark, three full document loads per route with 80ms artificial delay per local gateway request: before medians schedule 468ms / date recommendations 492ms / home 478ms; after idle rerun 485ms / 479ms / 471ms. Small differences are within run noise; NO substantial end-to-end latency win is established by this five-member fixture. The query work/payload is reduced, but hosted cold starts, provider latency and actual menu-navigation timing still require deployed measurement. Background SDK Auth/unsupported Realtime retries pollute total request/byte metrics, so those totals are not treated as pure route payload savings.
- An automatic approval review rejected replacing proxy `getClaims()` with `getSession()` as potentially weakening Auth. That command did not execute; the safer implementation retains verification and optimizes only request-local sharing and data retrieval. No permission request is needed for the retained implementation.
- Apply 012 once AFTER successful 011, then deploy the updated app. Do not rerun prior migrations. No hosted SQL, credentials, production user data, commit/push or deployment changed by this task. Final normal-environment build and local-server cleanup recorded below.


## Final 013/014 verification (2026-11-05)
- Final source: lint PASS (no warnings), typecheck PASS, 31 files / 203 unit/component/action tests PASS; no-QA-environment production build PASS, 19 routes. New plan choices still filter by recommendation eligibility; regression test confirms waiting songs remain excluded.
- SQL CURRENT continuous planning: 99/99 assertions PASS, including own-vote edit/withdraw/recast/isolation/canonical second device (17) and reason-free availability plus seeded data cleanup (10). Separate HISTORICAL-through010: 300/300 PASS. Existing date/plan membership, version and eligibility tests continue to pass.
- Actual Chrome focused workflow: 83/83 PASS, zero uncaught JavaScript exceptions. Multiple/range calendar date-only save/edit/delete; no absence reason input/output; attendance popup across 320/390/430/768/1280px; compact list has no repeated editors; detail difficulty/vote edit, own withdrawal and re-vote; padded password/PIN login; normal-member/newcomer and six-member plan behavior passed. Mobile 390px and desktop 1280px popup screenshots plus compact list screenshot visually inspected.
- Scope: Chrome emulation and production Next with disposable PGlite SQL/RLS and simulated Auth/REST; actual Supabase Auth/PostgREST/Realtime, physical iOS/Safari and hosted latency not verified. Local QA processes stopped; no operating SQL, commit, push or deployment performed. Apply unexecuted migrations in order (012 if pending, then 013, then 014), then deploy. 014 actually clears stored absence reason text and prevents recollection; empty legacy columns exist only for SQL compatibility. Negative song-vote reasons remain.


## Final broad audit result — 2026-11-05
- PASS: lint, standalone typecheck, 32 files / 213 unit/component/action tests, production build without QA env (19 routes).
- PASS: CURRENT SQL/RLS 99 assertions; separately HISTORICAL through010 300 assertions. Initial->014 migration chain executes in disposable PostgreSQL-compatible SQL engine with upgrade fixtures.
- PASS: one complete actual-Chrome run 158 checks / zero uncaught JS exceptions. Ten menu routes at 320/390/430/768/844/1280, followed by availability counts/names, draft preview, disabled duplicate calendar dates, nested modal Escape, tile date edit/delete, range/date-only writes, direct date-only plans, same-plan edits, five-plan capacity, song registration/difficulty/negative reason/vote withdrawal/recast, bad-credential retry and padded input, new-member inclusion, ordinary-member restrictions, and actual leader handoff. Former leader loses settings/plan controls; new leader can manage immediately and edit retained plans; all five plans preserved.
- Broad audit found no new reproducible APPLICATION failure in this scope. Test harness corrections were required for CDP Escape key codes, Runtime.evaluate quote escaping, and unsupported nested CSS :has selectors. Earlier failed attempts were not counted as final passes. No authentication weakening or new migration introduced.
- Added requested attendance nickname/part panel and view-only date selection. Names reuse existing scoped data; own unsaved date changes update the lists; view-only inspection leaves the draft intact. Long nickname/part labels wrap within mobile chips. New-name screenshot portion visually inspected at 390px; six-width layout checks passed.
- Limitations: production Next with disposable PGlite/RLS and simulated Auth/REST is not hosted Supabase integration. Physical iOS/Safari, real Supabase Auth/Realtime and true multi-connection concurrency remain unverified. No deployment, provider SQL, commit/push or real user data changed. QA servers stopped and normal build restored. Redeploy updated app for new attendance names; no new SQL for this follow-up.


## Final 015/016 validation — 2026-11-06
- PASS: lint, standalone typecheck, 35 unit/component/action files / 222 tests; CURRENT SQL/RLS 147 assertions, separately HISTORICAL through010 300 assertions. Initial-to016 upgrade chain executed with preserved-data fixtures.
- PASS: actual Chrome against production Next/local disposable SQL gateway: 180 checks, zero uncaught JS errors. Ten routes at 320/390/430/768/844/1280. Full existing date/calendar/edit/delete/range/attendance-name flows, five-plan/date-only/edit/delete flows, persistent votes/withdrawal/recast, normal and new member restrictions, PIN-free actual handoff and old-leader revocation all passed.
- New actual-browser checks: confirmed repertoire separate from candidates; leader direct decision is selectable despite pending votes; unconfirm keeps existing plan song snapshots; deleting a rehearsal keeps repertoire available; member confirmation contains the target name, fits320/390/1280, cancel keeps membership, second explicit confirmation removes only the selected member and home refreshes from6 to5. Ordinary members have no confirmation controls.
- Home screenshots at390/1280 and removal dialog at390 were visually inspected. Screenshots/report saved locally in ignored .qa-artifacts/mobile. Final browser report contains180 checks.
- Limitations: disposable PGlite SQL/RLS plus simulated localhost Auth/REST, not hosted Supabase Auth/PostgREST/Realtime, physical iOS/Safari or real multi-connection Postgres concurrency. No hosted SQL/deployment/real user data/commit/push changed. Owned local QA servers stopped; final normal-environment build result follows in PROGRESS.


## Final 017 validation — 2026-11-06
- PASS lint, typecheck, 36 unit files /232 tests. CURRENT SQL/RLS170 assertions; separately HISTORICAL through010300. All migrations through017 execute against disposable PGlite.
- PASS actual Chrome production-Next workflow:191 checks /zero uncaught JS exceptions. Existing six-width ten-route regression flows pass, including handoff, repertoire and removal. New toggle tests enable from leader settings, load site root directly into profile/PIN without code/password or an entry click, fit320/390/1280, reject incorrect personal PIN, accept correct PIN into canonical leader, create a regular member directly, hide setting from regular member, disable from leader settings and restore original code/password screen on stale direct URL.
- Direct-entry screenshots at390/1280 visually inspected; they use the existing photographed profile/PIN layout. Public page render creates no guest account; actual form submit performs the authenticated transaction. Hosted-provider Auth/REST/Realtime, physical Safari/iOS and multi-connection PostgreSQL concurrency remain unverified. Local SQL gateway simulates provider HTTP while executing real local migration/RLS/RPC logic.
- Final normal-environment production build (without QA overrides):PASS19 routes. Owned QA servers stopped. No hosted SQL, deployment, real user records, commit or push performed. Apply017 once AFTER016, redeploy, then leader toggles 밴드 관리 → 사이트 시작 화면 → 프로필 시작 화면 켜기. Default remains off until selected.


## Final 018 validation — 2026-11-06
- PASS lint/typecheck, 36 unit files /234 tests, CURRENT SQL185 assertions (15 new deletion/pending assertions), separately HISTORICAL through010300. Full initial->018 upgrade chain passes. Normal-environment production build restored:PASS19 routes. Diff whitespace check:PASS.
- Focused actual Chrome run QA_DELETE_SONG=1:15 checks PASS /zero uncaught JS errors. Normal five-member fixture created through Next actions; explicit repertoire confirmation removes vote form/tally and pending-list entry; confirmed song chosen into plan without new votes; delete dialog fits320/390/1280 and identifies song; cancel preserves song; confirm redirects to /songs and removes live song; plan snapshot still displays title. Mobile390 screenshot visually inspected.
- First browser attempt had an overbroad raw DOM selector matching Next's hidden retained detail page after a successful client redirect; corrected the test to inspect visible body text. No application fix needed for that selector failure. Second focus run passed completely; first attempt is not counted as passed. Browser report now records focused15 checks, not the previous full191 run.
- Local SQL gateway uses disposable PGlite/RLS/RPC with simulated Auth/REST; hosted Supabase Auth/Realtime, physical Safari/iOS and true concurrent Postgres remain unverified. Owned local servers stopped. No hosted data changes/deployment/commit/push. Apply018 once after017 and redeploy; no previous migration changes.


## Final PC/mobile audit including019 — 2026-11-06
- PASS: lint, standalone typecheck, 37 unit files /245 tests; CURRENT SQL/RLS202 assertions; separately HISTORICAL through010300. All migrations initial->019 pass in disposable PGlite with upgrade fixtures. Normal-environment production build restored:PASS19 routes; final diff whitespace check:PASS. QA servers stopped.
- Actual final Chrome checks: MOBILE full199 + DESKTOP native-mouse/keyboard full141 + MOBILE focused deletion/venue20 + DESKTOP focused deletion/venue20 =380 PASS, all four runs zero uncaught JS exceptions. Mobile matrix covers10 menu routes at320/390/430/768/844/1280, including844x390 landscape. Desktop full functional run uses1280px/non-mobile metrics, touch emulation disabled and mouse events; not just a widened mobile viewport. Earlier pre019 baseline runs are not included in380.
- Final complete flows: padded code/password/PIN and bad-credential retries; profile creation and canonical login; multi/range dates, counts/names, disabled duplicate saved dates, nested modal Escape, edit/delete; two-month button/keyboard limits; desktop skipping disabled cells without selection; date-only plan creation/edit/delete, five upcoming plan cap, persisted venue/home-first order; votes/difficulty/negative reason/withdrawal/recast; new-member roster inclusion; ordinary-member restrictions; actual leader handoff and immediate former-leader revocation; independent repertoire/plan snapshots; explicit member removal cancel/confirm; direct-start toggle/PIN/signup/fallback.
- New skill checks: defaultoff hides member inputs and home card; leader enables and fields/card appear; disable hides again. SQL verifies prior values preserved, missing skills ignored only when off, role denial and context parity. Venue focus runs save/show nearest home first, edit, clear, then delete the live song while retaining the saved plan song snapshot. Optional venue limits and legacy7-argument API preservation are covered in SQL/action tests.
- Visually inspected final mobile390 and desktop1280 screenshots of upcoming rehearsal with venue, no skill task when off. Final full reports: .qa-artifacts/mobile/full-audit.json and desktop/full-audit.json. Focus reports: each deletion-venue-audit.json. Artifacts are ignored local files.
- Fixed actual bugs: keyboard focus stuck beside saved disabled dates, PageUp/PageDown crossing allowed month bounds; month-change focus and short-month day clamping corrected with regression tests. User-requested two-month window and new019 feature changes are included. Historical saved dates/plans retained; stale landing 회차 wording removed. No new reproducible application failure remained within this exercised scope.
- Limits: local production Next + disposable PostgreSQL-compatible PGlite/RLS/RPC with simulated Auth/REST; not hosted Supabase Auth/PostgREST/Realtime, physical iOS/Safari, other browser engines or true multi-connection PostgreSQL concurrency. Do not treat local passes as operating-site certification. No hosted SQL/deployment/user data/commit/push changed.
- Deployment: apply202611050019_optional_skill_and_plan_location.sql once AFTER018, then deploy app. This is required for location column/new skill flags. Calendar/home layout changes are application code. Old migrations remain unchanged;019 preserves old7-argument saves and venue values on legacy edits.


## 2026-11-06 optional song difficulty / migration020 audit
- Implemented: existing leader skill toggle also controls candidate/repertoire difficulty summaries and detail inputs/history. Default OFF, explicit band flag passed to both song-list sections and detail page. Recommendation and database plan eligibility skip skill/difficulty requirements only while OFF, retaining all-current-member voting/quorum rules. ON restores stored values; no data purge. Existing venue, saved snapshots, confirmed repertoire bypass, role/version/cap checks and legacy7-argument wrapper retained. New020 replaces only the difficulty eligibility predicate in the8-argument plan RPC;019 and earlier migrations unchanged.
- PASS lint, standalone typecheck,37 unit files /251 tests. Added OFF/ON candidate/confirmed list/detail rendering, recommendation missing-difficulty and vote requirements, form hide/restore saved difficulty/version tests. Older difficulty-form tests explicitly enable the feature, preserving refresh/success/version assertions.
- PASS migration initial->020, CURRENT SQL/RLS206 assertions; HISTORICAL through010300 assertions tested separately. SQL tests verify missing difficulty+skill accepted while OFF, missing difficulty rejected while ON even with assigned skill, enabled fully-rated acceptance, preserved stored values, voting still required, ordinary-member/anonymous denial and venue/legacy-client preservation.
- PASS production Next/Chrome functional regression: MOBILE158 + DESKTOP160 =318 checks, zero uncaught JS exceptions on each run. Desktop uses native mouse/keyboard with touch emulation disabled and minimum1280px; mobile uses touch/mobile emulation and320/390/430/768/844/1280 layout checks within the workflow. QA_FAST skips the separate60-route matrix; these318 are actual functional workflow assertions, not a new complete browser/device matrix. Flags tested OFF/ON on list/detail, unrated voted candidate plan-choice inclusion/exclusion, ordinary member hidden difficulty, retained vote editing, dates/plans/venue/snapshots, handoff/removal and direct-start/PIN login. Visually inspected OFF390/mobile and1280/desktop and ON1280 screenshot.
- Reports: banddecision-web/.qa-artifacts/mobile/optional-difficulty-audit.json and desktop/optional-difficulty-audit.json (ignored local artifacts). Normal-environment production build restored: PASS19 routes. Owned QA servers stopped. No hosted SQL/deployment/data changes or git commit/push.
- First PC launch request was rejected because automatic approval review timed out before execution; one retry succeeded. No unresolved approval blocker. Initial unit run had2 old tests assuming default-visible difficulty; explicit ON setup restored those tests without removing their assertions. No reproducible application error remained in the exercised scope.
- Limits: local disposable PGlite/RLS/RPC with simulated Auth/REST, real local Next server actions/cookies and Chrome; hosted Supabase/Auth/Realtime, physical phones/Safari and true multi-connection PostgreSQL concurrency remain unverified.
- Deploy: apply202611050020_optional_song_difficulty.sql once AFTER019, then redeploy app. Both DB and application changes are required. Existing migrations should not be rerun.

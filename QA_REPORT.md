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

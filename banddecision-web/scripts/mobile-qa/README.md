# Local mobile browser QA

Windows Chrome and Node 22+ are required. This harness uses real Next pages, client components, touch events, server actions, cookies and the repository SQL migrations/RLS/RPCs. The localhost gateway substitutes Auth and the subset of REST used by the app; it does NOT implement hosted GoTrue, PostgREST, Realtime, CAPTCHA or provider rate limits.

The database is disposable in-memory PGlite. All listeners bind to 127.0.0.1. No remote project or production band is modified. Never use a production URL or key for this harness.

From banddecision-web, use three PowerShell terminals:

1. npm.cmd run test:mobile:gateway
2. Set the following process-local environment, then start Next:

    $env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54329'
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-browser-qa-only'
    npm.cmd run dev -- --hostname 127.0.0.1 --port 3101

3. npm.cmd run test:mobile

The browser uses a separate temporary profile with CDP on port 9223. It generates a new isolated five-person band on each run. Reports/screenshots/profiles are in ignored .qa-artifacts/mobile. A failure returns exit code 1 and saves failure.txt/failure.png. QA_FAST=1 skips the initial 50-page size matrix when debugging; normal test:mobile runs the matrix and all workflows. The development Next badge is hidden only by the QA driver so it cannot intercept bottom-navigation taps. No production component is hidden.

Platform authentication, multiple real connections, operating-system keyboards, Safari, physical phones, provider network latency, Realtime updates and deployment require separate verification. Reduced browser viewports are not physical-device testing. Stop the local servers and use a fresh shell without the QA variables before making a normal production build.

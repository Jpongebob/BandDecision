# BandDecision Web app

This folder contains the Next.js application. For setup and product behavior, see the repository [README](../README.md).

Install dependencies with `npm install`, configure `.env.local` from `.env.example`, apply the Supabase migrations, and start development with `npm run dev`.

## Band code and PIN login (v3.2)

The default flow is /bands/new to create a band, then /login (band code/shared password) followed by /login/member (existing profile + 6-digit PIN, or new nickname/part/PIN). The server issues a random 10-character band code. Member login lasts up to 30 days. Leaders unlock management and confirmation for 30 minutes with a separate administrator PIN.

Before using it:

1. Apply the NEW migration supabase/migrations/202611050002_band_code_login.sql once, after the two existing migrations. Do not rerun already-applied migrations.
2. In Supabase Authentication settings, enable **Allow anonymous sign-ins**. This provides device sessions only; it does not bypass the application's band/password/PIN checks. No service-role key is required.
3. Existing email members use /login/email, set a personal PIN under **내 정보**, and the leader enables code login under **밴드 관리**. Existing records keep their IDs. Do not create a duplicate band/profile for migration.
4. Deploy the updated code and verify real multi-device login, owner-only writes, admin elevation, logout, and credential rotation.

Passwords and PINs are hashed in the private schema and never returned to the browser. PIN attempts are throttled across devices. Changing a personal PIN revokes that member's other device sessions. Rotating shared credentials revokes other code sessions; email login remains available to existing accounts. A leader can reset other member PINs after administrator verification.

Anonymous Auth users include the permanent anchor IDs referenced by band data. **Do not run blanket anonymous-user cleanup**: deleting an anchor can remove profiles and owned records. Administrator-PIN recovery requires the Supabase project owner; there is no public reset bypass.

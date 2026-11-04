# Deployment

The application is in `banddecision-web/`. Production deployment requires a Supabase project and a Vercel project connected to this repository. The current checkout has neither provider credentials nor a Vercel project link, so these steps have not been run against a live service.

## Supabase

1. Create a Supabase project and copy its project URL and publishable/anon key.
2. In Authentication URL Configuration, set the production Site URL and allow these callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-production-host>/auth/callback`
   - Add preview host callbacks only if preview authentication is needed.
3. From `banddecision-web/`, authenticate and link the project, then apply every migration in order:

   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase test db
   ```

4. Configure the application environment variables below. Never put a service-role key in a browser-visible variable.

## Vercel

1. Import the GitHub repository and set **Root Directory** to `banddecision-web`.
2. Use `npm run build` as the build command. The project uses the standard Next.js output.
3. Add these variables to Preview and Production separately:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` in Production (the exact production origin, with no trailing slash)
   - Leave `NEXT_PUBLIC_SITE_URL` unset in Preview; server actions use Vercel's per-deployment `VERCEL_URL` for email callbacks and invite links.
4. Deploy a Preview first. Verify signup, email callback, login, password reset, band-scoped reads, member song permissions, date/vote ownership, and leader-only confirmation.
5. Add the final production callback URL in Supabase, then promote/deploy the verified revision to Production.

## Local production check

Copy `.env.example` to `.env.local`, fill in the Supabase values, then run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

The database pgTAP suite requires Supabase CLI and Docker. A successful local Next.js build does not validate remote authentication, RLS, RPCs, Realtime, or provider deployment.

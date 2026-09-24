# Cave connected foundation

This is the first account-backed slice, not a production launch. Rooms, notes, reading data and preferences can be manually saved as one account snapshot. Chat replies and prompt room generation remain prototype behavior. No live AI provider is connected.

## Run locally

Use Node 22 or newer. No npm runtime dependencies required.

1. Create a Supabase project and execute `sql/001_snapshots.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local`; enter the project HTTPS URL and **publishable** key (`sb_publishable_...`). Never enter a service role/secret key. The API intentionally refuses those keys.
3. Enable email authentication. In the Supabase email template, include `{{ .Token }}` so the sign-in email contains the OTP code expected by this client. Configure allowed URLs for your local and eventual deployment URLs.
4. Run `npm run build`, `npm test`, then `npm run dev`. Open http://localhost:3000.

Build copies reviewed sibling `../evening-lounge` frontend files when available, otherwise uses the self-contained `frontend/` source assets. It overlays `client/` account UI into `public/`. The ZIP includes frontend assets, so an extracted `cave-connected` folder can build independently.

## Deployment

Import this folder as a Vercel project root; use Node 22+, build command `npm run build`, output `public`. Configure the same two environment values on Vercel. Run the SQL migration in the intended Supabase project first. No deployment or remote database migration has been performed by this deliverable.

## API contract

- `GET /api/config`: `{configured:false}` or `{configured:true,supabaseUrl,supabasePublishableKey}`. Public config never contains server secrets.
- `GET /api/snapshot`: bearer access token required; returns `{snapshot,revision,updatedAt}`. Empty account returns null/0/null.
- `PUT /api/snapshot`: bearer access token and JSON `{snapshot:object,expectedRevision:integer}`. Returns saved snapshot/revision/time. `409 revision_conflict` means load/review the remote version before attempting another save; do not silently overwrite it.
- Errors: 400 invalid data, 401 invalid session, 413 too large, 503 missing configuration, 502 provider unavailable. Responses are not cached.

The backend verifies tokens through Supabase Auth and forwards the caller token to PostgREST. Row-level security scopes records to `auth.uid()`. The SQL RPC serializes writes per account and compares the expected revision in the same transaction. No client-supplied account ID is trusted.

## Scope and remaining validation

A snapshot is limited to 2 MiB including JSON overhead. Imported book text counts toward that limit; large libraries need dedicated object storage and per-item sync in a later slice. This is manual cloud backup/restore, not automatic merge or real-time multi-device sync. Prototype data remains in browser storage until explicitly backed up. Avoid sensitive information during initial testing.

`npm test` covers handler authorization rejection, token forwarding and verified-user filtering, conflict translation, payload limits and config redaction using mocked provider responses. These tests do not prove live Supabase RLS behavior. Before inviting users, run two-account integration tests against the real project: each account must be unable to read or modify the other account's row; concurrent stale writes must conflict. Also verify email delivery, expiry/recovery, account deletion, retention, rate limits and backup/restore on a second device.

References: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/auth/jwts

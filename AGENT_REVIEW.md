# Cave agent review — September 23, 2026

These are heuristic agent assessments and automated checks, not interviews or evidence of market demand.

Initial usability score: 7.5/10 (failed the user's 8 threshold).
Initial engineering robustness: 6.5/10; connected readiness: 3/10.
Revised usability score after fixes and targeted checks: 8.2/10 (passes prototype iteration gate only).
No production-readiness passing score has been assigned.

## Changes
- Company, presence and style stored per room, including reload.
- Conversation switching protected by explicit Finish flow.
- Conversation entry with no room starts creation.
- Books reachable from Saved.
- Choice focus restoration broadened.
- Malformed saved records normalized at startup and cloud restoration.
- Unsaved work triggers browser leave warning; drafts are not automatically saved.
- New connected slice: email-code sign-in, manual cloud backup and restore, revision conflicts, server-verified account identity and SQL RLS.

## Evidence
- Browser: malformed startup, no-room conversation, different room company, company reload, transcript switching passed.
- Books: import, bookmarks, theme/font, resume/reload, shelf membership and deletion passed.
- State normalizer: invalid records, pages, duplicate IDs, bookmarks, roundtrip passed.
- Backend: six tests with mocked Supabase responses passed.
- Cloud UI: simulated-provider email-code sign-in, backup, restore and sign-out passed.
- Legacy notebook test hit an outdated Rest selector; no new Rest verification claimed.

## Remaining gates
Saved note editing, durable explicit drafts and browser history navigation remain open. The cloud snapshot is capped at 2 MiB and is manual, not automatic sync. Live email delivery, two-account database isolation, retention/deletion and deployed operation remain unverified. AI chat and room generation are still demo behavior. Agent score does not measure comfort, usefulness or repeat usage.

# Web data cutover to Heroku

Account, sync, Sauka, and Quran API requests use `VITE_API_BASE_URL`, defaulting to
`https://qurannur-backend-d7d7312f118d.herokuapp.com`. The frontend may still be
hosted at `https://quran-nur.appwrite.network`; static hosting does not provide
accounts or application storage. Appwrite's browser SDK has been removed.

## What moved

- Email registration/sign-in, refresh, recovery, and sign-out use the backend
  auth contract. Registration establishes a session immediately. Sessions are
  scoped to the API origin; refresh is single-flight and transient failures
  preserve credentials. A refresh cannot restore a signed-out session.
- Bookmarks, preferences, reading history, planners, and other syncable state use
  `/v1/sync`. Pulls/pushes are serialized, validate the owner and server watermark,
  preserve legacy flattened fields, and merge device state before upload.
- Sync change detection uses one non-overlapping 30-second poll and an immediate
  check on returning to the tab. React cleanup removes listeners and timers.
- Sauka groups, membership, claims, guest assignments, progress, rounds, comments,
  and voice notes use `/v1/sauka`. Group changes refresh locally after operations
  and every 15 seconds while visible. Owners/admins and assignees are checked by
  the backend; the browser does not send authoritative identity fields.
- Voice notes are authenticated binary downloads converted to local object URLs.
  Files live in Postgres, not on a dyno disk. The file limit is 5 MB; the current
  shared media budget is 250 MB. Deleting groups/comments removes owned media.
- Quran chapters, verses, pages, selected translations/Mushaf layouts, Tajweed,
  tafsir, footnotes, juz metadata, and chapter-audio metadata come through Heroku.
  Actual recitation bytes still download directly from the established audio
  CDNs, and existing offline content remains available through IndexedDB.
  The unrelated prayer-time lookup retains its existing Aladhan provider.
- The service worker caches only public content routes on the configured API
  origin. It never caches auth, sync, group documents, or private audio requests.

## Existing users and data

An Appwrite login cookie is not a Heroku session: existing users sign in once
again. The operator importer preserves original account/document ids and exact
sync strings. Compatible source Argon2 password hashes are copied server-to-server,
so these users retain their passwords. Source MFA/disabled-account policy is not
silently bypassed; unsupported credentials require verified recovery.

The companion backend importer also moves Sauka documents and referenced voice
notes, preserving ids, timestamps, and membership. Dry runs download/read the
source but make no target writes. Re-runs retain newer target edits. No source
accounts or records are deleted. Keep the old data available for rollback and
any final delta import from an old open browser tab.

Do not run migration/setup scripts from a browser or include Appwrite server
keys in a build. The historical scripts under `scripts/` are operator tools,
not runtime dependencies. No real recovery email is sent during deployment
checks. Recovery delivery and Google OAuth activation still require their
provider-specific domain/client setup.

## Deploy and verify

1. Deploy the companion backend with schema migration 3, including Sauka tables
   and binary media storage. Allow the production frontend origin in
   `CORS_ORIGINS`. Keep administrative credentials local.
2. Dry-run and then execute identity/sync and Sauka imports with the operator's
   Appwrite read credentials and the target Postgres URL.
3. Run `npm ci`, `npm test -- --run`, and `npm run build` here. A browser network
   check should show application-data requests to Heroku and no Appwrite APIs.
4. Publish the reviewed `dist/` build to static hosting. Preserve SPA fallback to
   `index.html`, the PWA files, and the configured HTTPS API origin.
5. Verify the production API's `/_health` and `/_ready`, selected editions/pages,
   authentication, group permissions, and private voice-note reads.

A feature branch deployment must remain the site's configured production source
until these changes are merged into its normal production branch; otherwise a
later deploy from old source can restore the old backend configuration.

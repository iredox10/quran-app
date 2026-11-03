# Quran Nur web hosting

The web frontend is hosted at https://quran-nur-web-iredox-7034db77458a.herokuapp.com.
It uses the existing Quran Nur API at https://qurannur-backend-d7d7312f118d.herokuapp.com.

The Heroku Node build runs `npm run build`, then `npm start` serves `dist/` using
`server.mjs`. The server serves client-side routes through the app shell, returns
404 for missing assets, uses gzip for text assets, and avoids caching the service
worker or HTML shell. `VITE_API_BASE_URL` is the API origin and
`VITE_PUBLIC_WEB_URL` is the public frontend origin embedded into share messages.
Both variables must be configured before the build.

The initial Heroku deployment was prepared from the current local worktree in a
separate temporary checkout. Future updates require committing and pushing the
source changes and configuring a deployment workflow; the deployment is not
linked to GitHub automatically.

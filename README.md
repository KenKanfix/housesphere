# HouseSphere

**Your entire home, in one place.** A local-first household management PWA for inventory, warranties, maintenance, projects, documents, expenses, trusted trades and an AI home assistant. Ships as an installable web app and an Android app via Trusted Web Activity (TWA).

## Features

- **Dashboard** — home value, upcoming maintenance, expiring warranties and recent spend at a glance.
- **Inventory** — rooms, items, photos, purchase details and current value.
- **Warranties** — expiry reminders, receipts and linked inventory items.
- **Maintenance** — recurring tasks with due dates, history and automatic next-due scheduling.
- **Projects** — budgets, status tracking and linked expenses.
- **Documents** — insurance policies, manuals, certificates and receipts with preview.
- **Expenses** — categorised spending, per-project tracking and monthly totals.
- **Providers** — trusted trades, contact details and service history.
- **Assistant** — chat about your home, scan labels/receipts/manuals, and save extracted results.

All household data is stored locally in the browser with IndexedDB. There is no account, cloud database or sync. Export/import backups from **Settings**.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Dexie (IndexedDB) + `dexie-react-hooks`
- `vite-plugin-pwa` (Workbox) for offline support
- Google Gemini (native API) or OpenAI Chat Completions via a small serverless endpoint (Vercel) or Vite dev middleware
- Bubblewrap CLI for Android TWA packaging

## Quick start

Requires Node.js 20 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:5173. The AI assistant is optional: set `GEMINI_API_KEY` (or `OPENAI_API_KEY`) in `.env.local` to enable it, otherwise the app reports that it is not configured.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | No | `gemini` or `openai`. Defaults to Gemini when `GEMINI_API_KEY` is set. |
| `GEMINI_API_KEY` | No | Google AI Studio key. Enables the assistant and image scanning. Server-side only. |
| `GEMINI_MODEL` | No | Gemini model, defaults to `gemini-3.8-flash`. |
| `OPENAI_API_KEY` | No | OpenAI key, used when `AI_PROVIDER=openai`. Server-side only. |
| `OPENAI_MODEL` | No | OpenAI chat model, defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | No | Override the OpenAI-compatible API base URL. |

Google AI Studio now issues `AQ.` authorization keys. HouseSphere calls Gemini's native API, so both `AQ.` and older `AIza` keys work. Do not use the OpenAI-compatible `/v1beta/openai` route with an `AQ.` key.

Never expose the API key to the client. The key is read only by `api/ai.ts` in production and by the Vite dev middleware locally.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with the local AI endpoint. |
| `npm run build` | Type-check and build the production PWA into `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run typecheck` | Run TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm run android:init` | Generate the Android TWA project in `android/`. |
| `npm run android:build` | Build the signed APK and AAB in `android/`. |

## Deploying to Vercel

1. Push the project to GitHub, or run `npx vercel` from the project root.
2. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL=gemini-3.8-flash` in the Vercel project's environment variables. Use `OPENAI_API_KEY` instead if you prefer OpenAI.
3. Deploy. `vercel.json` handles the SPA rewrite, `api/ai.ts` and the `/.well-known/` path.

The PWA works fully without the AI endpoint. Offline caching is handled automatically after the first visit.

## Android TWA packaging

The repository includes:

- `twa-manifest.json` — Bubblewrap configuration.
- `public/.well-known/assetlinks.json` — Digital Asset Links template.
- `.github/workflows/twa-build.yml` — optional CI build.

### Prerequisites

- Deployed HTTPS URL (Vercel or a custom domain).
- JDK 17+ (JDK 21 is installed here).
- Android SDK/build tools — Bubblewrap offers to download these on first run.
- `npm install --global @bubblewrap/cli`.

### 1. Point the manifest at your deployment

Edit `twa-manifest.json` and replace every `housesphere.vercel.app` reference with your real host:

- `host`
- `iconUrl`
- `maskableIconUrl`
- `shortcuts[].chosenIconUrl`
- `webManifestUrl`
- `fullScopeUrl`

Keep `packageId` (`app.housesphere.twa`) unless you need a different application ID. It can never change after the first Play Store upload.

### 2. Generate the Android project

```powershell
npm run android:init
```

Bubblewrap validates the live PWA and asks you to confirm values and set a keystore password. It creates `android/android.keystore` (matching the `signingKey` path in the manifest). Keep that file and its passwords safe — it signs every future update.

If you prefer to create the key yourself:

```powershell
keytool -genkeypair -v -keystore android/android.keystore -alias housesphere -keyalg RSA -keysize 2048 -validity 10000
```

### 3. Build the signed app

```powershell
npm run android:build
```

Outputs:

- `android/app-release-signed.apk` — for direct install/testing.
- `android/app-release-bundle.aab` — for the Play Store.

### 4. Configure Digital Asset Links

Without asset links, the TWA shows a browser address bar. Get the signing certificate fingerprint:

```powershell
keytool -list -v -keystore android/android.keystore -alias housesphere
```

Copy the **SHA-256** value into `public/.well-known/assetlinks.json`, replacing `REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT`. If you use Play App Signing (recommended), also add the **App signing key certificate** SHA-256 from the Play Console under **Test and release → Setup → App integrity**. Multiple fingerprints are allowed:

```json
"sha256_cert_fingerprints": [
  "AA:BB:...:11",
  "CC:DD:...:22"
]
```

Deploy, then verify:

```text
https://your-domain/.well-known/assetlinks.json
```

Use Google's [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator) to confirm the association.

### 5. Publish

Upload the `.aab` to the Play Console, complete the data safety form (the app stores data locally; AI requests are sent to Google Gemini or OpenAI only when used) and roll out. For each update, increment `appVersionCode` (and usually `appVersionName`) in `twa-manifest.json` before rebuilding.

### CI build

The workflow `.github/workflows/twa-build.yml` builds on demand. Add these repository secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of `android/android.keystore`. |
| `KEYSTORE_PASSWORD` | Keystore password. |
| `KEY_PASSWORD` | Key password (often the same). |

Generate the Base64 value with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android/android.keystore"))
```

Then run **Actions → Build Android TWA → Run workflow**. The signed APK/AAB is uploaded as an artifact.

## Publishing the source to GitHub

```powershell
git init
git add .
git commit -m "Initial HouseSphere PWA"
gh auth login
gh repo create housesphere --public --source=. --remote=origin --push
```

`android/`, keystores and `.env.local` are gitignored.

## Project structure

```text
api/                 Vercel serverless AI endpoint
public/              PWA icons, favicon, asset links
scripts/             Icon generation
server/              Shared AI request handler
src/components/      App shell, UI primitives, inputs, toasts
src/features/        Create/edit forms
src/lib/             Database, AI client, hooks, reminders, demo data
src/pages/           Screens for each module
twa-manifest.json    Android TWA configuration
vercel.json          SPA rewrites and headers
```

## Data notes

- Clearing site data or uninstalling the PWA removes the local database. Export a backup from **Settings** first.
- Settings includes one-click demo data for exploring the app.
- Currency defaults to AUD and can be changed in **Settings**.
- Notifications are local only and require OS/browser permission.

## Troubleshooting

- **Address bar visible in the Android app** — asset links are missing, unreachable, use the wrong package ID or the wrong signing fingerprint. Re-deploy and re-test.
- **Bubblewrap PWA validation fails** — confirm the site is publicly reachable over HTTPS and icons resolve; CI uses `--skipPwaValidation` because assets may not be deployed yet.
- **AI says not configured** — set `GEMINI_API_KEY` (or `OPENAI_API_KEY`) and restart the dev server or redeploy.

# HouseSphere

**Your entire home, in one place.** A local-first household management PWA for inventory, warranties, maintenance, projects, documents, expenses, trusted trades and an AI home assistant. Ships as an installable web app and as native Android/iOS apps via Capacitor.

## Features

- **Dashboard** — home value, upcoming maintenance, expiring warranties and recent spend at a glance.
- **Inventory** — rooms, items, photos, purchase details and current value.
- **Warranties** — expiry reminders, receipts and linked inventory items.
- **Maintenance** — recurring tasks with due dates, history and automatic next-due scheduling.
- **Projects** — budgets, status tracking and linked expenses.
- **Documents** — insurance policies, manuals, certificates and receipts with preview.
- **Expenses** — categorised spending, per-project tracking and monthly totals.
- **Recurring bills** — council rates, utilities and insurance with due reminders and one-tap payment logging.
- **Providers** — trusted trades, contact details and service history.
- **Assistant** — chat about your home, scan labels/receipts/manuals (front and back for bills), and save extracted results.

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

Open http://localhost:5173. The AI assistant is optional and off by default. Turn it on in Settings and either use the deployment key — set `GEMINI_API_KEY` (or `OPENAI_API_KEY`) in `.env.local`; the built-in AI allows 3 actions per day, or 10 with HouseSphere Pro — or enter your own Gemini/OpenAI key, which is stored only on that device and is unlimited.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | No | `gemini` or `openai`. Defaults to Gemini when `GEMINI_API_KEY` is set. |
| `GEMINI_API_KEY` | No | Google AI Studio key. Enables the assistant and image scanning. Server-side only. |
| `GEMINI_MODEL` | No | Gemini model, defaults to `gemini-3.8-flash`. |
| `OPENAI_API_KEY` | No | OpenAI key, used when `AI_PROVIDER=openai`. Server-side only. |
| `OPENAI_MODEL` | No | OpenAI chat model, defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | No | Override the OpenAI-compatible API base URL. |
| `VITE_API_BASE_URL` | Native builds | Absolute deployed API URL, e.g. `https://housesphere.vercel.app`. Leave unset for the web PWA. |
| `VITE_REVENUECAT_API_KEY` | Native builds | Public RevenueCat SDK key (`goog_…` for Google Play, `appl_…` for the App Store). |
| `REVENUECAT_WEBHOOK_SECRET` | Production | Bearer secret configured on the RevenueCat webhook. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Production | Shared quota counters and the Pro entitlement written by the webhook. |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS allowlist for `/api/ai`. Defaults to the PWA and Capacitor WebView origins. |
| `FREE_AI_DAILY_LIMIT` / `PRO_AI_DAILY_LIMIT` | No | Server-side ceilings; default 3 and 10. |

Google AI Studio now issues `AQ.` authorization keys. HouseSphere calls Gemini's native API, so both `AQ.` and older `AIza` keys work. Do not use the OpenAI-compatible `/v1beta/openai` route with an `AQ.` key.

The built-in API key is never sent to the client: it is read only by `api/ai.ts` in production and by the Vite dev middleware locally. If a user chooses to use their own key, it is stored in that device's IndexedDB, sent with each request through the same endpoint, and excluded from exported backups.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with the local AI endpoint. |
| `npm run build` | Type-check and build the production PWA into `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run typecheck` | Run TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm run cap:sync` | Build the PWA and copy web assets into both native projects. |
| `npm run cap:android` | Sync, then open the Android project in Android Studio. |
| `npm run cap:ios` | Sync, then open the iOS project in Xcode (requires macOS). |
| `npm run android:build` | Sync and build the signed Android AAB. |
| `npm run ios:build` | Sync and build the iOS archive (requires macOS). |

## Deploying to Vercel

1. Push the project to GitHub, or run `npx vercel` from the project root.
2. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL=gemini-3.8-flash` in the Vercel project's environment variables. Use `OPENAI_API_KEY` instead if you prefer OpenAI.
3. Deploy. `vercel.json` handles the SPA rewrite, `api/ai.ts` and the `/.well-known/` path.

The PWA works fully without the AI endpoint. Offline caching is handled automatically after the first visit.

## Native mobile apps (Capacitor)

The web PWA stays deployable. `android/` and `ios/` are Capacitor projects generated from `dist/`. The native app calls the deployed `/api/ai` endpoint, so `VITE_API_BASE_URL` must point at the deployed host when building for native.

### Prerequisites

- Deployed HTTPS host (Vercel) for the AI API and webhook.
- Node 20+, JDK 17+ and the Android SDK.
- macOS and Xcode for iOS builds.
- A RevenueCat project with separate Google Play and App Store apps, entitlement ID `pro`, and a monthly package on the default offering.
- An Upstash Redis REST database.

### 1. Configure environment

Copy `.env.example` to `.env.local` and fill in `VITE_API_BASE_URL`, `VITE_REVENUECAT_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `REVENUECAT_WEBHOOK_SECRET`. Android uses the `goog_…` SDK key; iOS uses the `appl_…` key, so swap it before `npm run cap:ios` and back before Android builds.

`VITE_` values are baked into the bundle at build time — set them as plain environment variables in Vercel/GitHub Actions, not Secrets.

### 2. Signing

The previous Play signing key is preserved at `android/android.keystore` (a backup copy is in gitignored `keystore/`). Copy `android-keystore.properties.example` to `android/keystore.properties` and fill in the passwords. Both the properties file and the keystore are gitignored. Keep the keystore safe — it signs every future update.

The application ID is `app.housesphere.twa` and cannot change after the first Play upload. Increment `versionCode` in `android/app/build.gradle` for every release.

### 3. Build and sync

```powershell
npm run cap:sync
npm run cap:android
npm run android:build
```

`cap:sync` builds the PWA and copies assets into both native projects. `cap:android` opens Android Studio; `cap:ios` opens Xcode. The Android AAB is written to `android/app/build/outputs/bundle/release/app-release.aab`.

After any web change, re-run `npm run cap:sync` before building a native app.

### 4. RevenueCat and subscriptions

- Create a monthly auto-renewing product `pro_monthly` (US$2.99 in the US) in both stores and attach it to the RevenueCat default offering as the monthly package. Play only shows the "Create subscription" option after it has seen an AAB containing the Billing permission.
- Create the entitlement `pro` in RevenueCat and attach the product to it. Names must match exactly.
- Add the webhook `https://housesphere.vercel.app/api/webhooks/revenuecat` with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` and all event types enabled. It writes `housesphere:entitlement:<userId>` in Upstash; `/api/ai` reads that key to enforce 10 actions/day for Pro and 3/day for free.
- Remove license-testing accounts before release, otherwise real purchases may not charge.
- Publish a Terms of Use link in the store metadata: `https://housesphere.vercel.app/terms`.

Pricing is $2.99/month for 10 built-in AI actions per day. Play's commission rises from 15% to 30% after 12 months of a subscription, so review the price if provider costs change. Customers can instead use their own Gemini/OpenAI key for unlimited actions.

### 5. Publish

Upload the AAB to Play Console and the archive to App Store Connect, complete the data safety forms (data is stored locally; AI requests go to Gemini/OpenAI only when used) and roll out.

### CI build

The workflow `.github/workflows/android-build.yml` builds the signed AAB on demand. Add these repository secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of `android/android.keystore`. |
| `KEYSTORE_PASSWORD` | Keystore password. |
| `KEY_PASSWORD` | Key password (often the same). |
| `KEY_ALIAS` | Key alias, normally `housesphere`. |
| `VITE_API_BASE_URL` | Deployed HTTPS host. |
| `VITE_REVENUECAT_API_KEY` | Google Play `goog_…` SDK key. |

Generate the Base64 value with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android/android.keystore"))
```

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
android/             Capacitor Android project (gitignored)
api/                 Vercel serverless AI endpoint, quota helpers, RevenueCat webhook
ios/                 Capacitor iOS project
public/              PWA icons, favicon, privacy and terms pages
scripts/             Icon generation
server/              Shared AI request handler
src/billing/         RevenueCat wrapper and entitlement sync
src/components/      App shell, UI primitives, paywall, inputs, toasts
src/features/        Create/edit forms
src/lib/             Database, AI client, hooks, reminders, demo data
src/pages/           Screens for each module
vercel.json          SPA rewrites and headers
```

## Data notes

- Clearing site data or uninstalling the PWA removes the local database. Export a backup from **Settings** first.
- **Settings → Data & backup → Backup location** chooses where exports go. In a Chromium browser, *Choose folder* opens a folder picker and the permission is remembered on the device; other browsers fall back to the normal download. On mobile, exports are written to `Documents/HouseSphere/Backups` by default — change the folder path in Settings or use *Share last backup* to copy a file into Drive/Files. Import still uses the file picker.
- Settings includes one-click demo data for exploring the app.
- Currency defaults to AUD and can be changed in **Settings**.
- Notifications are local only and require OS/browser permission.
- Daily AI limits are fair-use controls, not hard security: installs are anonymous and clearing app data generates a new ID. Server-side counters in Upstash stop casual abuse; a signed-in account would be needed for strict enforcement.

## Privacy

HouseSphere is local-first: household data is stored in IndexedDB on the device and is not uploaded to a HouseSphere database. The optional AI assistant/scanning forwards requests to the configured provider.

- Public policy: **https://housesphere.vercel.app/privacy** (also served at `/privacy.html` from `public/privacy.html`)
- Terms of use: **https://housesphere.vercel.app/terms** (`public/terms.html`)
- Use both URLs in the Play Store and App Store metadata.
- The in-app **About** page (`/about`) and paywall link to both documents.

## Troubleshooting

- **Native app says AI is not configured** — `VITE_API_BASE_URL` was not set when the bundle was built, so the app is calling its own local WebView. Set it to the deployed HTTPS host and rebuild with `npm run cap:sync`.
- **Purchases fail with empty offerings** — the store product is wired to the RevenueCat "test store" column instead of the actual Google Play/App Store column, or the subscription is not "Ready to Sell".
- **Purchase succeeds but the limit stays at 3** — the RevenueCat entitlement must be named exactly `pro`, and the webhook secret in RevenueCat must match `REVENUECAT_WEBHOOK_SECRET`. Check that the webhook returns 200 and that Upstash holds `housesphere:entitlement:<userId>`.
- **Pro resets after a restart** — verify `configurePurchases()` runs at app startup and that the `pro` entitlement is present in `customerInfo.entitlements.active`.
- **Rate limited immediately** — the server counts by `X-User-Id`; clear all app data generates a new ID, and 10 requests in one scan session can exhaust the daily allowance. Use your own key for unlimited access.
- **Xcode cannot resolve the RevenueCat package** — `cap sync ios` rewrites `ios/App/CapApp-SPM/Package.swift` to a local `node_modules` path. Restore the remote `https://github.com/RevenueCat/purchases-capacitor.git` dependency after every sync when building on a Mac without `node_modules`.
- **AI says not configured in the browser** — set `GEMINI_API_KEY` (or `OPENAI_API_KEY`) and restart the dev server or redeploy.

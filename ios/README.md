# HouseSphere for iOS

The iOS app is a Capacitor wrapper around the same React PWA used on the web and on Android.

## Build locally

From the repository root on a Mac with Xcode installed:

```powershell
npm install
Copy-Item .env.example .env.local
npm run cap:ios
```

Set `VITE_API_BASE_URL` to the deployed HTTPS host and `VITE_REVENUECAT_API_KEY` to the `appl_…` SDK key before `npm run cap:ios` — both are baked into the bundle at build time. Switch back to the `goog_…` key before any Android build.

Open `ios/App/App.xcworkspace` in Xcode to run on a simulator or device. `npm run ios:build` produces a release archive.

## RevenueCat

- Bundle identifier: `app.housesphere.twa`.
- Entitlement ID: `pro`.
- Store product: `pro_monthly`, monthly auto-renewing, US$2.99 in the US.
- Upload the App Store Connect API Team Key and the In-App Purchase `.p8` key to RevenueCat so products and transactions sync.
- Use `https://housesphere.vercel.app/terms` as the Terms of Use link in App Store Connect metadata.

## Package.swift

`npx cap sync ios` rewrites `ios/App/CapApp-SPM/Package.swift` so the RevenueCat plugin is referenced through a local `node_modules` path. The Filesystem and Share plugins still use local `node_modules` paths, so run `npm install` on the Mac before opening Xcode. Restore the RevenueCat dependency to its remote form after every sync when building without `node_modules`:

```swift
.package(url: "https://github.com/RevenueCat/purchases-capacitor.git", exact: "13.8.0")
```

and use `.product(name: "RevenuecatPurchasesCapacitor", package: "purchases-capacitor")`.

The committed file already has the remote form. The app icon is in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`; the original artwork is kept in `store-assets/`.

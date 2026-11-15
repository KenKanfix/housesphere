# HouseSphere for iOS

A small native SwiftUI shell that opens the HouseSphere PWA (`https://housesphere.vercel.app`)
in a `WKWebView`. It supports swipe-back, pull-to-refresh, external links opening in Safari,
photo uploads for scanning, and keeps the web app's local data (IndexedDB/localStorage) on the device.

## Requirements

- A Mac with **Xcode 16 or newer**.
- An **Apple Developer Program** membership (for App Store distribution).
- No CocoaPods, Node.js or other tooling is needed on the Mac.

## Open and run

1. Copy the `ios` folder (or unzip `HouseSphere-iOS.zip`) to the Mac.
2. Open `ios/HouseSphere.xcodeproj` in Xcode.
3. Select the **HouseSphere** project → **Signing & Capabilities**.
   - Choose your Apple Developer **Team**.
   - Change **Bundle Identifier** if `app.housesphere.ios` is not available in your account.
     Update the App Store Connect app record to match whatever you choose.
4. Pick an iPhone simulator or a connected iPhone and press **Run** (⌘R).

The app loads the production site, so make sure the latest web build is deployed first.

## Upload to App Store Connect

1. In App Store Connect, create a new app:
   - Platform: **iOS**
   - Name: **HouseSphere**
   - Bundle ID: the same identifier you set in Xcode
   - SKU: e.g. `housesphere-ios`
2. In Xcode choose **Any iOS Device (arm64)** as the run destination.
3. **Product → Archive**.
4. In the Organizer choose **Distribute App → App Store Connect → Upload**.
5. Wait for the build to finish processing in App Store Connect, then attach it to the version.
6. Fill in the listing (description, keywords, screenshots, age rating, category), set the
   privacy policy URL to `https://housesphere.vercel.app/privacy`, and submit for review.

For every new upload, increment **Build** (`CURRENT_PROJECT_VERSION`) in the target's
General settings. Increment **Version** (`MARKETING_VERSION`) for each user-visible release.

## App Store review caveats

Apple's App Review Guideline **4.2 (Minimum Functionality)** rejects apps that are only a
repackaged website. This project is intentionally a thin wrapper, so review is a real risk.
To improve the odds, add native value before submitting, for example:

- native camera capture for receipts instead of a web file picker;
- local notifications for maintenance and warranty reminders (APNs);
- a share extension to save documents/photos into the app;
- bundled offline content and native screens for the most-used flows.

If you later sell HouseSphere Pro or an AI subscription inside the iOS app, Guideline
**3.1.1** requires Apple In-App Purchase (or RevenueCat on top of StoreKit) for digital goods.
Do not link to an external checkout from the iOS build.

Other limitations of the current wrapper:

- The page is loaded from the live site; if the site is down the app shows a retry screen.
- Offline behaviour depends on WKWebView's service-worker support and what the PWA has cached.
- Web push notifications are not supported by WKWebView; APNs would need native work.
- Direct camera capture from `<input capture>` can vary on iOS; the photo library picker works.

## Design and assets

- App icon: `HouseSphere/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
  (1024×1024, no alpha). Regenerate it if the brand mark changes.
- Accent colour: teal `#0F766E` (`AccentColor`).
- Launch background: cream `#F4F2EC` (`LaunchBackground`).
- Bundle display name, version and photo/camera usage strings are in `HouseSphere/Info.plist`.
- `HouseSphere/PrivacyInfo.xcprivacy` declares no tracking and no collected data types.

## Updating the web app

The iOS shell does not bundle the web assets. Deploy the PWA as usual and the app will pick
up the new version on next launch/refresh. If you want the app to work fully offline, bundle
the `dist` output locally and load it from the app sandbox instead of the remote URL.

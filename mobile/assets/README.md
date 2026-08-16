# Native artwork handoff

Native artwork is intentionally absent from the Codex handoff so the migration remains text-only.
Create the following production assets locally before Expo prebuild or store submission:

1. a square NEXORA application icon suitable for Expo's `expo.icon` setting;
2. an Android adaptive foreground icon with the required safe-zone padding;
3. the Android adaptive background color or background image configuration;
4. lightweight dark NEXORA splash artwork for `expo-splash-screen`; and
5. a monochrome Android notification icon if the final notification design requires one.

After creating local artwork, add explicit paths back to `app.json`, validate them with
`npx expo-doctor`, and only then run `npx expo prebuild --platform android`. Do not commit APKs,
AABs, signing keys, Gradle caches, or build outputs.

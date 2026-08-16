# NEXORA Mobile

True native Expo/React Native client. It does not embed or import the web application.

## Local validation

1. Copy `.env.example` to `.env` and supply the existing Supabase project's public URL and
   publishable key. Never add server secrets.
2. Run `npm install` in this directory.
3. Run `npm run typecheck`, `npm run lint`, `npm run doctor`, and `npm run export`.

The Android package preserves the existing Play listing identity documented in
`../docs/NATIVE_MIGRATION.md`. Binary visual assets are intentionally deferred for the text-only
handoff; see `assets/README.md` before running local prebuild.

After this source branch reaches the integration branch, create the documented assets locally,
restore their Expo configuration, then run `npx expo prebuild --platform android`.

# NEXORA monetization deployment runbook

## Code-complete architecture

Stripe Web checkout and the signed Stripe webhook remain authoritative for Web purchases. Android uses native Google Play Billing, sends its purchase token to `google-play-subscription`, and unlocks only after the backend verifies `purchases.subscriptionsv2.get`. Both providers persist the provider-neutral `entitlement` consumed by Web and mobile. Cancellation retains Premium until `current_period_end`; active, trialing, canceled-paid-through, and Google grace-period states are entitled. Expired, revoked, and on-hold states are Free.

Free limits are 3 active projects, 30 open tasks, 3 active study subjects, 10 standard Assistant requests per UTC day, and 2 attachment analyses. Premium limits are 100 standard Assistant requests and 20 attachment analyses; core entity caps are practically unlimited while backend abuse controls still apply. Downgrade triggers block only new records, never reads, edits, completion, archiving, or deletion.

The migration makes subscriptions server-owned, adds provider metadata, provides an atomic advisory-lock usage claim, and adds insert-time core limits. Deploy the migration and the `google-play-subscription`, `stripe-webhook`, and `ai-chat` Edge Functions.

## External configuration required

No Google product ID was present, so supply the real Play Console values rather than inventing one:

- Mobile build variables: `EXPO_PUBLIC_GOOGLE_PLAY_SUBSCRIPTION_ID`, `EXPO_PUBLIC_GOOGLE_PLAY_BASE_PLAN_ID`, and optionally `EXPO_PUBLIC_WEB_BILLING_URL`.
- Edge secrets: `GOOGLE_PLAY_SUBSCRIPTION_ID`, `GOOGLE_PLAY_BASE_PLAN_ID`, `GOOGLE_PLAY_PACKAGE_NAME`, and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- Create and activate the monthly subscription/base plan at the US$12 equivalent, grant Android Publisher API access to the service account, and build a new Android dev-client/release artifact (native IAP is unavailable in Expo Go).
- Configure a closed/internal test track and licensed tester. Configure Play Real-time Developer Notifications through Pub/Sub before production lifecycle acceptance; until RTDN is deployed, restore/refresh reconciles provider state.
- Keep the existing Stripe `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, and portal configuration. No new Stripe setup is required if those existing values are live.

## Physical billing acceptance

1. **Free:** sign in; confirm Settings and Premium say Gratuito; verify displayed limits; consume Assistant quota and attachments; reach each creation cap; verify upgrade messaging and that ordinary Projects, Tasks, and Studies remain usable.
2. **Android:** install from a Play test track; confirm localized price and native sheet; cancel once; complete a licensed-test purchase; verify automatic Premium state in Premium and Settings; restart; restore; then manage and cancel in Play and confirm paid-through access.
3. **Cross-platform:** buy through existing Stripe Web checkout on another account; sign into Android; confirm Premium without Android Stripe checkout. Buy via Play and confirm Web reads Premium.
4. **Security:** attempt direct subscription writes and client plan spoofing; verify RLS/server entitlement prevents both. Exercise concurrent quota requests and confirm the server refuses excess usage.
5. **Regression:** verify Home, Assistant, Projects, Tasks, Studies, Settings, logout/login, expiry, on-hold, refund/revocation, and network-error behavior.

Live monetization is **not finalized** until both a Play-installed licensed test purchase and the Stripe cross-platform test pass on physical Android.

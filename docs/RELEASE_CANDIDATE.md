# NEXORA release candidate

## Readiness matrix

| Module        | Status  | RC decision                                                                 |
| ------------- | ------- | --------------------------------------------------------------------------- |
| Dashboard     | READY   | Exposed                                                                     |
| Chat          | READY   | Exposed; requires `ai-chat` and provider secrets in live mode               |
| Projects      | READY   | Exposed                                                                     |
| Productivity  | READY   | Exposed                                                                     |
| Studies       | READY   | Exposed; requires the studies migrations                                    |
| Agents        | HIDDEN  | Removed from the RC launcher pending live validation                        |
| Studio        | HIDDEN  | Removed from the RC launcher pending live validation                        |
| Content       | HIDDEN  | Removed from the RC launcher pending live validation                        |
| Documents     | HIDDEN  | Removed from the RC launcher pending live validation                        |
| Translate     | HIDDEN  | Removed from the RC launcher pending live validation                        |
| Finance       | HIDDEN  | Removed from the RC launcher pending live validation                        |
| Settings      | READY   | Exposed                                                                     |
| Premium       | PARTIAL | Entitlement remains backend-owned; checkout requires Stripe configuration   |
| Notifications | PARTIAL | UI remains available; delivery requires deployed push functions and secrets |
| Search        | READY   | Searches only modules exposed in the RC                                     |

`RELEASE_MODULES` is the intentionally small launcher allowlist. Hidden routes remain in the
codebase so work is not destroyed, but testers are not presented with unvalidated modules.

## Production handoff

Run these commands from the repository root after linking the correct Supabase and Vercel
projects. Review migration state before pushing; never reset production data.

```bash
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase migration list
supabase db push
supabase functions deploy ai-chat
supabase functions deploy nexora-voice
supabase functions deploy scheduled-reminders
supabase functions deploy push-send
supabase secrets set OPENAI_API_KEY=<VALUE>
supabase secrets set ELEVENLABS_API_KEY=<VALUE>
supabase secrets set ELEVENLABS_VOICE_ID_NEXORA=<VALUE>
supabase secrets set VAPID_PUBLIC_KEY=<VALUE>
supabase secrets set VAPID_PRIVATE_KEY=<VALUE>
supabase secrets set VAPID_SUBJECT=<VALUE>
supabase secrets set SCHEDULER_SECRET=<VALUE>
supabase secrets set STRIPE_SECRET_KEY=<VALUE>
supabase secrets set STRIPE_WEBHOOK_SECRET=<VALUE>
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel deploy --prod
git push -u origin release/nexora-rc
```

Only set secrets actually used by the linked project. Provider-specific AI secret names must
match `supabase/functions/ai-chat` before deployment. Configure Google OAuth and its callback URL
in Supabase separately if Google login is offered to testers.

# NXR-V7 Auth mail delivery runbook

## Scope and verified code contract

This runbook separates application readiness from message delivery. The Web and
Android clients submit confirmation and recovery requests to Supabase Auth;
neither client sends email directly and neither may contain a Resend credential.

The current client contract is:

| Flow | Web redirect | Android redirect |
| --- | --- | --- |
| OAuth | `https://nexora-os-eosin.vercel.app/auth/callback` | `nexora://auth/callback` |
| Signup confirmation | `https://nexora-os-eosin.vercel.app/confirm-email` | `nexora://auth/callback` |
| Password recovery | `https://nexora-os-eosin.vercel.app/reset-password` | `nexora://auth/callback?next=%2Fauth%2Freset-password` |

The production origin in the table is the expected Vercel origin. The Web code
derives these destinations from the browser's trusted current origin, so the
production deployment must actually use that origin.

## Delivery boundary

An accepted `signUp`, `resend`, or `resetPasswordForEmail` response proves only
that Supabase Auth accepted the request. It does **not** prove that a mailer sent
the message or that the recipient accepted it. Diagnose in this order:

1. Browser/device makes one request and records its HTTP status and safe error
   code (never tokens, links, passwords, or credentials).
2. Supabase Auth logs show whether Auth accepted or rejected the request.
3. Auth mail settings show whether Custom SMTP is enabled.
4. Resend logs show accepted, delivered, bounced, suppressed, or rejected.
5. The recipient checks Inbox and Spam.

An Edge Function secret named for Resend is write-only application secret
storage. Its presence does not populate the Supabase Auth SMTP password and
does not connect Auth to Resend.

## Supabase Dashboard action required

The repository has no linked Supabase CLI state or authenticated Management API
session. Therefore the current remote mailer, URL allowlist, templates, provider
switches, and rate limits cannot be truthfully classified from this checkout.
An authorized operator must perform this inspection in the Supabase Dashboard:

1. Open **Authentication → Emails / SMTP Settings**.
2. Enable **Custom SMTP** and enter:
   - Host: `smtp.resend.com`
   - Port: `465` (TLS/SSL)
   - Username: `resend`
   - Password: use the same Resend API Key already created as the SMTP password.
   - Sender email: select an address on a domain that the Resend Dashboard
     actually reports as verified.
   - Sender name: the approved NEXORA product name.
3. Do not delete or rotate the existing Supabase secret. Do not copy its value
   into source control, Vercel client variables, Expo configuration, Android, a
   terminal transcript, or an issue/PR.
4. Open **Authentication → URL Configuration**. Preserve valid existing entries
   and ensure these exact redirect entries exist:
   - `http://localhost:5173/**`
   - `http://localhost:8080/**`
   - `nexora://auth/callback**`
   - `https://nexora-os-eosin.vercel.app/auth/callback`
   - `https://nexora-os-eosin.vercel.app/confirm-email`
   - `https://nexora-os-eosin.vercel.app/reset-password`
5. Do not introduce a broad production wildcard.
6. Open **Authentication → Email Templates**. For **Confirm signup** and
   **Reset password / Recovery**, confirm the primary link uses Supabase's
   generated confirmation URL variable. Remove any hardcoded Web Site URL or
   Android deep link from template links; the per-request redirect supplied by
   each client must be preserved.
7. Open **Authentication → Providers → Email** and verify email signup and
   confirmation policy are enabled as intended.
8. Open **Authentication → Rate Limits** and record the email-send limits. In
   Auth logs, check for HTTP `429` and `over_email_send_rate_limit`. Do not add
   automatic retries; the clients already serialize submission and confirmation
   resend has a 60-second cooldown.

## Resend sender action required

In the Resend Dashboard:

1. Confirm the selected production domain is **Verified**. Do not use a testing
   sender for production.
2. Confirm the exact sender entered in Supabase belongs to that verified domain.
3. Confirm the Resend-provided SPF and DKIM records pass. Add a suitable DMARC
   policy for the production domain if one is not already present.
4. During runtime validation, inspect Resend delivery events for the test
   recipients. A bounce, suppression, or provider rejection must be resolved at
   Resend/domain/recipient level rather than hidden with a frontend success
   message.

## Runtime Gmail validation required

After the Dashboard checks are complete, use unique test addresses and run both
platform flows without repeatedly clicking send:

1. **Web signup:** create a new account on the production Vercel origin, receive
   the Gmail message, open it once, confirm the browser lands on
   `/confirm-email`, reaches an authenticated session, and enters NEXORA.
2. **Web recovery:** request recovery, receive the Gmail message, open it once,
   confirm `/reset-password` accepts a new password, then sign in with that new
   password. Reopening the used link must not permit another reset.
3. **Android V7 signup:** create a new account, open the confirmation message on
   the physical device from cold, warm, and already-open app states, and confirm
   `nexora://auth/callback` restores the session.
4. **Android V7 recovery:** request recovery, open the message on the physical
   device, confirm the callback forwards only to `/auth/reset-password`, update
   the password, and sign in with it. Also verify expired and reused links fail
   safely.

Code checks alone must never be reported as delivery success. Delivery is green
only after Supabase Auth logs, Resend delivery events, and the Gmail inbox agree.

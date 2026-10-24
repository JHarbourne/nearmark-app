# Branded auth emails

When you add an editor in Supabase, they get an invitation email. Out of the box it's the
plain, unbranded Supabase default — "Supabase Auth" as the sender, no mention of the app.
These templates replace the body with a branded one so editors recognise what they've been
invited to.

| App | Supabase project | Template file |
|-----|------------------|---------------|
| Tollesbury App | `wijnnlzxjerymjrlvblv` | [`invite-tollesbury.html`](invite-tollesbury.html) |
| LGBT History Project | `rewowvjmeoggigrwhdvl` | [`invite-lgbt.html`](invite-lgbt.html) |

## How to apply (per project)

1. Supabase Dashboard → the project → **Authentication → Emails → Templates**.
2. Select **"Invite user"**.
3. **Subject** — set to:
   - Tollesbury: `You're invited to help edit the Tollesbury App`
   - LGBT: `You're invited to help edit the LGBT History Project`
4. **Message body** — switch to source/HTML and paste the whole contents of the matching
   `.html` file. Save.
5. Add an editor as usual (Authentication → Users → **Invite**). They'll receive the branded
   email. `{{ .ConfirmationURL }}` and `{{ .Email }}` are filled in by Supabase.

The same look works for the other templates if you want them too — **Confirm signup**,
**Magic Link**, **Reset password**. Reuse the card and swap the heading/body wording; the
link variable differs per template (`{{ .ConfirmationURL }}` for invite/confirm/recovery,
`{{ .Token }}`/`{{ .ConfirmationURL }}` for magic link — Supabase shows the available
variables above each editor).

## Custom SMTP — configured (Brevo)

Both projects send auth emails through **Brevo** (custom SMTP), so the From name is the app —
not "Supabase Auth" — and Supabase's built-in-mailer rate limit no longer applies.

**Supabase → each project → Authentication → Emails → SMTP settings:**
- Host `smtp-relay.brevo.com` · Port `587` · Username `af78db001@smtp-brevo.com`
- Password = a Brevo **SMTP key** (Brevo → *SMTP & API → SMTP*). The key is **account-level** —
  one key works for every project. Brevo shows it once; generating a new one does **not** revoke
  existing keys, so it's safe to regenerate if you lose it.

| Project | Sender email | Sender name |
|---|---|---|
| Tollesbury (`wijnnlzxjerymjrlvblv`) | `hello@tollesbury.app` | Tollesbury App |
| LGBT (`rewowvjmeoggigrwhdvl`) | `noreply@lgbthistoryuk.org` | LGBT History Project |

Both sender **domains are authenticated in Brevo** (DKIM CNAMEs + `brevo-code` TXT). Notes:
- `tollesbury.app` DNS is at **GoDaddy** (site is on Vercel, but DNS is GoDaddy).
- `lgbthistoryuk.org` has an SPF record; `tollesbury.app` should add one so a brand-new domain
  doesn't get junked on its first sends (DKIM alone passes DMARC, but filters like to see SPF):

      TXT  @  v=spf1 include:spf.brevo.com ~all

- No mailbox exists at `tollesbury.app`, so set a working **reply-to** (e.g. an `lgbthistoryuk.org`
  address) if replies matter.

> Note: SMTP + domain authentication are dashboard/DNS settings, not code — nothing here is
> deployed by a build. These template files live in the repo only so the branded HTML is
> versioned and easy to re-paste.

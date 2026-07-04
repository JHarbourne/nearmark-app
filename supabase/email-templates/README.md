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

## Sender name — needs custom SMTP (separate from the template)

The template changes the *body*, but the **From** name is still "Supabase Auth" until you
point the project at your own SMTP. To fix the sender:

- Authentication → Emails → **SMTP Settings** → enable custom SMTP.
- A Brevo (Sendinblue) SMTP account is already set up on the shared feedback project
  (`rzfrnnoixxlqyiavivtp`) — reuse those SMTP credentials here, or add a sender for each app.
- Set **Sender name** to e.g. `Tollesbury Arts Trail` / `LGBT History UK` and a sender email
  on a domain you control.

Until custom SMTP is on, Supabase's built-in mailer also rate-limits invites (a few per
hour), which is another reason to switch it on before inviting several editors.

> Note: these are dashboard settings, not code — nothing here is deployed by a build. The
> files live in the repo only so the branded HTML is versioned and easy to re-paste.

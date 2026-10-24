# Branded auth emails

Branded HTML for the Supabase Auth **"Invite user"** email – the first thing a new editor
sees. One file per deployment (each app has its own Supabase project, so the template is set
per project).

| App | File | Supabase project |
|---|---|---|
| Tollesbury | `invite-tollesbury.html` | `wijnnlzxjerymjrlvblv` |
| LGBT History Project | `invite-lgbt.html` | `rewowvjmeoggigrwhdvl` |

## How to apply (per project)

1. Supabase dashboard → the project → **Authentication → Email Templates → "Invite user"**.
2. **Subject:** `You're invited to the <App> editor backoffice` (the suggestion is at the top of each file).
3. **Message body:** paste the whole HTML file (minus the leading `<!-- … -->` comment if you like).
4. Save. Send yourself a test invite from the admin (User management → invite your own spare address) to check it.

## Notes

- **Keep `{{ .ConfirmationURL }}`** exactly as-is – Supabase fills it in with the one-time
  set-password link. The template uses it twice (the button and the copy-paste fallback).
- The copy points new editors at **https://nearmark.co.uk/guide** (Getting Started), matching the
  in-app welcome card.
- **Accent colour** is a single hex, used three times (top bar, button, links). Swap it to retheme –
  Tollesbury `#B23B3B` (red), LGBT `#6B46E5` (violet).
- Typography is written with HTML entities (`&ndash;`, `&rsquo;`) so it renders correctly in every
  mail client regardless of charset. Spaced en dashes, not em dashes (house style).

## Sender address (optional, for full branding)

The template controls the email's *content*. The **from** address is still Supabase's default
(`noreply@mail.app.supabase.io`) with a low rate limit. To send from your own address (and lift the
limit), set **custom SMTP** under Authentication → settings, using **Brevo** SMTP credentials.
⚠️ When you do, turn **Authorised IPs off** for the Brevo key – Supabase's sending IPs rotate, so an
IP allow-list makes sends fail with "unrecognised IP". (See the `brevo-authorised-ips` note.)

Related: the in-app Getting Started card (migration 042) and the guide at nearmark.co.uk/guide.

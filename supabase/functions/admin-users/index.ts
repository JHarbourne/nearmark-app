// Admin user management — Supabase Edge Function.
// Holds the service-role key server-side (never in the browser) and exposes
// invite / list / remove, callable only by a signed-in admin (any authenticated
// session — accounts are provisioned, self-signup stays disabled).
//
// Deploy:  supabase functions deploy admin-users
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
//  automatically — no secrets to set.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authorise: the caller must be a signed-in admin (a valid session user, not
    // just the anon key). Edge Functions already require a valid JWT; this also
    // confirms it represents a real user.
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) return json({ error: 'Not authorised — sign in as an admin.' }, 401)

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
    const { action, email, id, redirectTo } = await req.json().catch(() => ({}))

    if (action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers()
      if (error) throw error
      const users = data.users.map((u) => ({
        id: u.id, email: u.email, createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at, confirmed: !!u.email_confirmed_at,
      }))
      return json({ users })
    }

    if (action === 'invite') {
      const addr = (email ?? '').trim()
      if (!addr) return json({ error: 'Email is required.' }, 400)
      const { data, error } = await admin.auth.admin.inviteUserByEmail(addr, redirectTo ? { redirectTo } : undefined)
      if (error) return json({ error: error.message }, 400)
      return json({ user: { id: data.user.id, email: data.user.email } })
    }

    if (action === 'remove') {
      if (!id) return json({ error: 'User id is required.' }, 400)
      if (id === user.id) return json({ error: 'You can’t remove your own account.' }, 400)
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

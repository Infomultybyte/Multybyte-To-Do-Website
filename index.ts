// =====================================================================
// admin-create-staff
//
// Creates a new Staff Auth account (email + password) plus its
// `profiles` row. This is the ONLY place in the entire project that
// touches the Supabase service_role key — it runs server-side, inside
// Supabase's Edge Function runtime, and that key is never sent to, or
// reachable from, any browser. The React app never imports or sees it;
// it only ever calls this function via `supabase.functions.invoke`,
// which forwards the signed-in admin's own access token, not any
// secret key.
//
// Why this has to be an Edge Function at all: `auth.admin.createUser`
// (the only way to create an Auth user with a password you set,
// as opposed to a self-service signup) requires the service_role key.
// Putting that key in frontend code would let anyone with dev tools
// open create/delete/modify ANY user in the project — so it is kept
// here instead, behind an admin check this function performs itself.
//
// Deploy with the Supabase CLI:
//   supabase functions deploy admin-create-staff
// No manual secrets to configure: SUPABASE_URL, SUPABASE_ANON_KEY, and
// SUPABASE_SERVICE_ROLE_KEY are all provided automatically to every
// Edge Function by the Supabase platform.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    // Should never happen on Supabase's platform (these three are always
    // injected), but fail loudly rather than silently if it ever does.
    return jsonResponse({ error: 'Server misconfiguration.' }, 500)
  }

  // ---------------------------------------------------------------
  // Step 1 — who is calling? Verify the caller's own access token
  // (forwarded automatically by supabase.functions.invoke) using the
  // ANON key, exactly like any other authenticated request would be
  // verified. This does NOT yet use the service role.
  // ---------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: callerUser },
    error: callerError,
  } = await callerClient.auth.getUser()

  if (callerError || !callerUser) {
    return jsonResponse({ error: 'Not authenticated.' }, 401)
  }

  // ---------------------------------------------------------------
  // Step 2 — is the caller an ACTIVE ADMIN? Only now do we reach for
  // the service role client, and only to check the caller's own
  // profile row (never anyone else's, at this point).
  // ---------------------------------------------------------------
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role, status')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
    return jsonResponse({ error: 'Admin access required.' }, 403)
  }

  // ---------------------------------------------------------------
  // Step 3 — validate input.
  // ---------------------------------------------------------------
  let body
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }

  const full_name = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const department = typeof body?.department === 'string' ? body.department.trim() : ''
  const status = body?.status === 'inactive' ? 'inactive' : 'active'

  if (!full_name) {
    return jsonResponse({ error: 'Full name is required.' }, 400)
  }
  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'A valid email address is required.' }, 400)
  }
  if (!password || password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters.' }, 400)
  }

  // ---------------------------------------------------------------
  // Step 3b — check for a duplicate email ourselves first, rather
  // than relying on guessing Supabase Auth's error wording (it isn't
  // always something with "already"/"registered" in it). `profiles`
  // has a unique constraint on email, so this is a reliable check.
  // ---------------------------------------------------------------
  const { data: emailOwner } = await serviceClient
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (emailOwner) {
    return jsonResponse({ error: 'A user with this email already exists.' }, 400)
  }

  // ---------------------------------------------------------------
  // Step 4 — create the Auth user. `handle_new_user` (database
  // trigger) creates the matching `profiles` row automatically as
  // role='staff', status='active', copying full_name/department out
  // of user_metadata.
  // ---------------------------------------------------------------
  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, department: department || null },
  })

  if (createError || !created?.user) {
    const lower = (createError?.message || '').toLowerCase()
    const looksLikeDuplicate =
      lower.includes('already') || lower.includes('registered') || lower.includes('duplicate') || lower.includes('exists')
    const message = looksLikeDuplicate
      ? 'A user with this email already exists.'
      : createError?.message || 'Could not create the account.'
    return jsonResponse({ error: message }, 400)
  }

  const newUserId = created.user.id

  // ---------------------------------------------------------------
  // Step 5 — if the admin asked for the new account to start out
  // Inactive, flip it now. handle_new_user always inserts status =
  // 'active', so this is a follow-up update, done with the service
  // role (which the prevent_self_privilege_escalation trigger always
  // allows) rather than depending on any browser-facing policy.
  // ---------------------------------------------------------------
  if (status === 'inactive') {
    const { error: statusError } = await serviceClient
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', newUserId)

    if (statusError) {
      // The account exists and can log in as active; surface this so
      // the admin knows to retry the deactivation from the Staff table.
      return jsonResponse(
        {
          error:
            'Staff account created, but could not set it to Inactive. You can deactivate it from the Staff table.',
        },
        207
      )
    }
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, full_name, email, department, status, created_at, role')
    .eq('id', newUserId)
    .single()

  return jsonResponse({ profile }, 201)
})

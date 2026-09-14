import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Populated with a human-readable message if the client could not be
// created (missing env vars, or a malformed URL). Checked by App.jsx so
// a misconfigured deployment shows a clear message instead of a blank
// white screen — supabase-js's createClient() throws synchronously on
// a falsy/invalid URL, and an uncaught throw at module-eval time would
// otherwise crash the whole app before React ever mounts.
export let supabaseConfigError = null

// This client uses the ANON key only. It is safe to expose in the browser
// because all data access is enforced by Supabase Row Level Security (RLS).
// The service-role key must NEVER be used or imported here or anywhere in
// frontend code.
export let supabase = null

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseConfigError =
    'Missing Supabase environment variables. Check that VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY are set (see .env.example, or your Vercel project\'s ' +
    'Environment Variables settings).'
  // eslint-disable-next-line no-console
  console.error(supabaseConfigError)
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (err) {
    supabaseConfigError = `Could not initialize Supabase: ${err?.message || 'unknown error'}`
    // eslint-disable-next-line no-console
    console.error(supabaseConfigError, err)
  }
}

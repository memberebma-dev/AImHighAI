import { createClient, type Session } from '@supabase/supabase-js'
import { makeDb } from '../../shared/dbAdapter'

/**
 * Supabase-backed replacement for the old Blink client. The name `blink` is
 * kept so existing `blink.db.<table>` and `blink.auth.*` calls keep working.
 * Browser access uses the publishable key + the user's session, so Postgres
 * RLS limits every query to the signed-in user's own rows.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set')
}

export const supabase = createClient(url, key)

// Cached so the old synchronous Blink-style getters still work.
let session: Session | null = null
export const authReady: Promise<void> = supabase.auth.getSession().then(({ data }) => {
  session = data.session
})
supabase.auth.onAuthStateChange((_event, s) => {
  session = s
})

export const blink = {
  db: makeDb(supabase),
  auth: {
    currentUser: () => (session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null),
    getToken: () => session?.access_token ?? null,
    /** Emails a one-click sign-in link. */
    login: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  },
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, authReady } from '@/lib/blink'

interface AuthUser { id: string; email: string }
interface AuthState { user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean }

const AuthContext = createContext<AuthState>({ user: null, isAuthenticated: false, isLoading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true })

  useEffect(() => {
    const apply = (u: { id: string; email?: string | null } | null | undefined) =>
      setState({ user: u ? { id: u.id, email: u.email ?? '' } : null, isAuthenticated: !!u, isLoading: false })
    authReady.then(() => supabase.auth.getSession()).then(({ data }) => apply(data.session?.user))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user))
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

/** Same shape the app used from Blink, so call sites don't change. */
export function useBlinkAuth(): AuthState {
  return useContext(AuthContext)
}

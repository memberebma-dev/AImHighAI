import { useEffect, useState } from 'react'
import { supabase } from '@/lib/blink'
import { readAuthRedirect } from '@/lib/authRedirect'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Mode = 'signin' | 'signup' | 'link' | 'forgot'

const input = 'w-full h-12 rounded-md bg-slate-900 border border-slate-700 px-4 text-white'
const redirectTo = () => window.location.origin

/** Sign in with password, create an account, Google, or an emailed link. */
export function LoginForm() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const r = readAuthRedirect(window.location.hash, window.location.search)
    if (r.error) {
      setError(r.error)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok?: string) => {
    setBusy(true); setError(null); setNotice(null)
    try {
      const { error } = await fn()
      if (error) setError(error.message)
      else if (ok) setNotice(ok)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const em = email.trim()
    if (mode === 'signin') return run(() => supabase.auth.signInWithPassword({ email: em, password }))
    if (mode === 'signup') {
      return run(async () => {
        const res = await supabase.auth.signUp({ email: em, password, options: { emailRedirectTo: redirectTo() } })
        // Email confirmation off → signed in right away; on → they need the email.
        if (!res.error && !res.data.session) setNotice(`Account created. Open the confirmation email sent to ${em} on this device, then sign in.`)
        return res
      })
    }
    if (mode === 'link') return run(() => supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: redirectTo() } }), `Sign-in link sent to ${em}. Open the newest email — older links stop working.`)
    return run(() => supabase.auth.resetPasswordForEmail(em, { redirectTo: redirectTo() }), `Password reset link sent to ${em}.`)
  }

  const google = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
      if (error && /provider is not enabled/i.test(error.message)) {
        toast.error('Google sign-in is not switched on yet')
        return { error: { message: 'Google sign-in is not switched on yet. Use email and password for now.' } }
      }
      return { error }
    })

  const needsPassword = mode === 'signin' || mode === 'signup'
  const label = { signin: 'Sign in', signup: 'Create account', link: 'Email me a sign-in link', forgot: 'Send reset link' }[mode]

  return (
    <div className="space-y-3">
      {(mode === 'signin' || mode === 'signup') && (
        <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-900 p-1">
          {(['signin', 'signup'] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(null); setNotice(null) }}
              className={`h-10 rounded text-sm font-semibold ${mode === m ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
      )}

      <Button type="button" onClick={google} disabled={busy} variant="outline" className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 font-semibold">
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-800" />or<span className="h-px flex-1 bg-slate-800" /></div>

      <form className="space-y-3" onSubmit={submit}>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={input} />
        {needsPassword && (
          <input type="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Choose a password (8+ characters)' : 'Password'} className={input} />
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-teal-400">{notice}</p>}
        <Button type="submit" disabled={busy} className="w-full h-12 bg-teal-600 hover:bg-teal-500 text-lg font-semibold">
          {busy ? 'Working…' : label}
        </Button>
      </form>

      <div className="flex justify-between text-xs text-slate-400">
        {mode === 'signin' ? <button type="button" onClick={() => setMode('forgot')} className="hover:text-white">Forgot password?</button> : <button type="button" onClick={() => setMode('signin')} className="hover:text-white">Back to sign in</button>}
        {mode !== 'link' && <button type="button" onClick={() => setMode('link')} className="hover:text-white">Email me a link instead</button>}
      </div>

      <p className="text-xs text-slate-500 text-center pt-2">
        <a href="/free-audit" className="text-teal-400">Free Lead Leak Audit</a> · <a href="/missed-call-calculator" className="hover:text-slate-300">Calculator</a> · <a href="/privacy" className="hover:text-slate-300">Privacy</a> · <a href="/terms" className="hover:text-slate-300">Terms</a>
      </p>
    </div>
  )
}

/** Shown after a password-reset link: set the new password. */
export function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(null)
      const { error } = await supabase.auth.updateUser({ password })
      setBusy(false)
      if (error) setError(error.message)
      else { toast.success('Password updated'); onDone() }
    }}>
      <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" className={input} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full h-12 bg-teal-600 hover:bg-teal-500 text-lg font-semibold">{busy ? 'Saving…' : 'Save new password'}</Button>
    </form>
  )
}

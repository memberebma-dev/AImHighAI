/**
 * When an email link or Google sign-in fails, Supabase sends the user back with
 * the reason in the URL (…#error=access_denied&error_description=Email+link+is+invalid…).
 * The old login screen ignored it, so a dead link just showed the empty form again.
 */
export interface AuthRedirect {
  error: string | null
  recovery: boolean
}

export function readAuthRedirect(hash: string, search = ''): AuthRedirect {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const query = new URLSearchParams(search.replace(/^\?/, ''))
  const code = params.get('error_code') || query.get('error_code')
  const desc = params.get('error_description') || query.get('error_description')
  const raw = params.get('error') || query.get('error')
  let error: string | null = null
  if (code === 'otp_expired') error = 'That sign-in link has expired or was already used. Sign in with your password below, or request a new link.'
  else if (desc || raw) error = (desc || raw || '').replace(/\+/g, ' ')
  return { error, recovery: params.get('type') === 'recovery' }
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readAuthRedirect } from './authRedirect.js'

test('expired email link gets a plain-language message', () => {
  const r = readAuthRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
  assert.match(r.error!, /expired or was already used/)
  assert.equal(r.recovery, false)
})

test('other errors show Supabase\'s own description', () => {
  assert.equal(readAuthRedirect('', '?error=server_error&error_description=Unable+to+exchange+external+code').error, 'Unable to exchange external code')
})

test('a normal sign-in or empty URL has no error', () => {
  assert.equal(readAuthRedirect('#access_token=abc&type=magiclink').error, null)
  assert.equal(readAuthRedirect('').error, null)
})

test('password reset link is detected', () => {
  assert.equal(readAuthRedirect('#access_token=abc&type=recovery').recovery, true)
})

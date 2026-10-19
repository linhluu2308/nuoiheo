import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CenteredMessage } from './AppDataContext'
import { isOwner } from './repository'
import { supabase } from './supabase'

export const signOut = () => supabase.auth.signOut()

const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

/**
 * Shows the app only to a signed-in Google account that is on the allowed list.
 * The database enforces the same rule (row-level security); this just explains it on screen.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    setAllowed(undefined)
    if (!userId) return
    isOwner().then(setAllowed, () => setAllowed(false))
  }, [userId])

  if (session === undefined || (session && allowed === undefined)) return <CenteredMessage>Đang tải…</CenteredMessage>

  if (!session) {
    return (
      <CenteredMessage>
        <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-6">
          <h1 className="mb-1 text-lg font-semibold text-ink">Nuôi heo</h1>
          <p className="mb-5 text-sm text-muted">Đăng nhập để xem và ghi chi tiêu.</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-ink hover:bg-hover"
          >
            <GoogleIcon /> Đăng nhập bằng Google
          </button>
        </div>
      </CenteredMessage>
    )
  }

  if (!allowed) {
    return (
      <CenteredMessage>
        <p className="mb-1 font-medium text-ink">Tài khoản {session.user.email} không có quyền dùng app này.</p>
        <p className="mb-4 text-muted">Đăng nhập bằng tài khoản Google của chủ app.</p>
        <button type="button" onClick={signOut} className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-hover">
          Đăng xuất
        </button>
      </CenteredMessage>
    )
  }

  return children
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

import { useEffect, useState } from 'react';
import type { Session } from '@nhost/nhost-js/session';
import { nhost } from '../nhost/client';

export function useAuth() {
  // undefined = session not yet determined (loading)
  // null     = no active session (unauthenticated)
  // Session  = authenticated
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Storage has been pre-initialized by initializeNhostStorage() in _layout.tsx,
    // so getUserSession() returns the correct value synchronously.
    setSession(nhost.getUserSession());

    // Subscribe to future changes: sign-in, sign-out, token refresh
    const unsubscribe = nhost.sessionStorage.onChange((s) => {
      setSession(s);
    });

    return unsubscribe;
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isLoading: session === undefined,
    isAuthenticated: session != null,
  };
}

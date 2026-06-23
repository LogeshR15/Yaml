import { createContext, useContext, useEffect, useState } from 'react';
import { isUserAuthenticated, signOut as catalystSignOut, type CatalystUser } from './catalyst-auth';

interface AuthContextType {
  user: CatalystUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
});

const SDK_POLL_INTERVAL = 200;  // ms between retries
const SDK_TIMEOUT = 10000;       // give up after 10s

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CatalystUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    // Poll until window.catalyst is injected by Slate, then check auth.
    // Without this, isUserAuthenticated() rejects immediately ("SDK not loaded")
    // on first render because Slate injects the SDK slightly after the app mounts.
    const poll = () => {
      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (window as any).catalyst;
      if (!sdk?.auth) {
        if (Date.now() - start < SDK_TIMEOUT) {
          setTimeout(poll, SDK_POLL_INTERVAL);
        } else {
          // SDK never loaded (local dev without Slate) — treat as logged out
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // SDK is ready — check if user is already authenticated
      isUserAuthenticated()
        .then((u) => { if (!cancelled) setUser(u); })
        .catch(() => { if (!cancelled) setUser(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut: catalystSignOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

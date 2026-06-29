import { createContext, useContext, useEffect, useState } from 'react';
import {
  isUserAuthenticated,
  isSdkAvailable,
  signOut as catalystSignOut,
  type CatalystUser,
} from './catalyst-auth';

interface AuthContextType {
  user: CatalystUser | null;
  loading: boolean;
  /** True once the Catalyst SDK is present (deployed Slate site, not local dev). */
  sdkAvailable: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sdkAvailable: false,
  signOut: () => {},
});

const SDK_POLL_INTERVAL = 200; // ms between retries
const SDK_TIMEOUT = 10000; // give up after 10s

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CatalystUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sdkAvailable, setSdkAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    // Slate injects window.catalyst slightly after the app mounts, so poll for it.
    const poll = () => {
      if (cancelled) return;

      if (!isSdkAvailable()) {
        if (Date.now() - start < SDK_TIMEOUT) {
          setTimeout(poll, SDK_POLL_INTERVAL);
        } else {
          // SDK never loaded (local dev) — treat as logged out, no gating.
          setSdkAvailable(false);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setSdkAvailable(true);
      isUserAuthenticated()
        .then((u) => { if (!cancelled) setUser(u); })
        .catch(() => { if (!cancelled) setUser(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  // Render children unconditionally — the public app must be usable immediately,
  // regardless of auth state. Only the Download action consults `user`.
  return (
    <AuthContext.Provider value={{ user, loading, sdkAvailable, signOut: catalystSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

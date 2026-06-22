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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CatalystUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const result = isUserAuthenticated();
      if (result && typeof result.then === 'function') {
        result
          .then(setUser)
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch {
      setUser(null);
      setLoading(false);
    }
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

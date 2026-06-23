import React, { useEffect } from 'react';
import { useAuth } from '@/utils/AuthContext';
import { Zap, Loader2 } from 'lucide-react';

/**
 * Auth page for Catalyst HOSTED authentication.
 *
 * Hosted Auth flow:
 * 1. App checks isUserAuthenticated() on load (AuthContext)
 * 2. If not logged in, ProtectedRoute sends user to /login (this component)
 * 3. This component redirects to Catalyst's hosted sign-in page
 *    (/__catalyst/auth/login) with a redirect_url back to the app
 * 4. User signs in on Catalyst's hosted page
 * 5. Catalyst redirects back to the app — AuthContext picks up the session
 *
 * The login page UI (branding, social providers) is configured in:
 * Catalyst Console → Authentication → Hosted Auth → Customize
 */

// After sign-in, Catalyst redirects here
const REDIRECT_AFTER_LOGIN = window.location.origin + '/';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Already signed in — nothing to do (ProtectedRoute handles redirect)
    if (user) return;

    // Redirect to Catalyst hosted login page.
    // Catalyst will redirect back to REDIRECT_AFTER_LOGIN after successful login.
    const hostedLoginUrl =
      `${window.location.origin}/__catalyst/auth/login` +
      `?redirect_url=${encodeURIComponent(REDIRECT_AFTER_LOGIN)}`;

    window.location.href = hostedLoginUrl;
  }, [user, loading]);

  // Show a brief loading spinner while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
        <Zap className="w-6 h-6 text-white" />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Redirecting to sign in…
      </div>
    </div>
  );
};

export default Auth;

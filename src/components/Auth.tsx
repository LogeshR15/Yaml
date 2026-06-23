import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '@/utils/AuthContext';

const CONTAINER_ID = 'catalyst-login-container';
const ZAID = import.meta.env.VITE_CATALYST_ZAID as string;

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const initiated = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/', { replace: true });
      return;
    }
    if (initiated.current) return;
    initiated.current = true;

    // Slate auto-injects the Catalyst SDK but it may not be ready immediately.
    // Poll until window.catalyst is available, then render the sign-in widget.
    const trySignIn = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (window as any).catalyst;
      if (sdk?.auth?.signIn) {
        sdk.auth.signIn(CONTAINER_ID, { platform_type: 'web', zaid: ZAID });
      } else {
        setTimeout(trySignIn, 150);
      }
    };
    trySignIn();
  }, [user, loading, navigate]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Sign in to ZIA YAML Studio</h1>
            <p className="text-sm text-gray-500 mt-1">Use your Zoho account to continue</p>
          </div>
        </div>
        <div id={CONTAINER_ID} className="min-h-[120px]" />
      </div>
    </div>
  );
};

export default Auth;

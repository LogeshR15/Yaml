import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '@/utils/AuthContext';

const CONTAINER_ID = 'catalyst-login-container';
const ZAID = import.meta.env.VITE_CATALYST_ZAID as string;

// Max time to wait for the Catalyst SDK to appear on window (ms)
const SDK_TIMEOUT_MS = 8000;

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const initiated = useRef(false);
  const [sdkError, setSdkError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (user) { navigate('/', { replace: true }); return; }
    if (initiated.current) return;
    initiated.current = true;

    if (!ZAID) {
      setSdkError('VITE_CATALYST_ZAID is not configured. Set it in Catalyst Console → Slate → Environment Variables.');
      return;
    }

    // Catalyst Slate auto-injects the SDK — poll until it's available
    const start = Date.now();
    const trySignIn = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (window as any).catalyst;
      if (sdk?.auth?.signIn) {
        try {
          sdk.auth.signIn(CONTAINER_ID, { platform_type: 'web', zaid: ZAID });
        } catch (e) {
          setSdkError(`Failed to initialise Catalyst auth: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else if (Date.now() - start > SDK_TIMEOUT_MS) {
        setSdkError(
          'Catalyst SDK did not load. Make sure this app is deployed via Catalyst Slate, ' +
          'and the domain is added to Authorized Domains in Catalyst Console → Authentication.'
        );
      } else {
        setTimeout(trySignIn, 200);
      }
    };
    trySignIn();
  }, [user, loading, navigate]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Sign in to ZIA YAML Studio</h1>
            <p className="text-sm text-gray-500 mt-1">Use your Zoho account to continue</p>
          </div>
        </div>

        {/* SDK error */}
        {sdkError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-semibold mb-1">Authentication setup issue</p>
              <p>{sdkError}</p>
            </div>
          </div>
        ) : (
          /* Catalyst embedded login widget renders here */
          <div id={CONTAINER_ID} className="min-h-[120px]" />
        )}

      </div>
    </div>
  );
};

export default Auth;

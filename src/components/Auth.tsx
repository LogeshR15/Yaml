import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { signInWithZoho } from '@/utils/catalyst-auth';
import { useAuth } from '@/utils/AuthContext';

const CONTAINER_ID = 'catalyst-login-container';

const Auth: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
      return;
    }
    signInWithZoho(CONTAINER_ID);
  }, [user, navigate]);

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

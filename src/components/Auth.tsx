import React, { useEffect } from 'react';
import { useAuth } from '@/utils/AuthContext';
import { useNavigate } from 'react-router-dom';

const CATALYST_AUTH_BASE =
  'https://yaml-60039712979.development.catalystserverless.in/__catalyst/auth/login';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/', { replace: true });
    } else {
      const redirectUrl = encodeURIComponent(window.location.origin);
      window.location.href = `${CATALYST_AUTH_BASE}?redirect_url=${redirectUrl}`;
    }
  }, [user, loading, navigate]);

  return null;
};

export default Auth;

import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiClient, authApi } from '~/api/apiClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('access_token');

    if (!token) {
      setAuthState('unauthenticated');
      return;
    }

    setAuthState('checking');
    authApi.getCurrentUser()
      .then(() => {
        if (!cancelled) setAuthState('authenticated');
      })
      .catch(() => {
        apiClient.clearAuth();
        if (!cancelled) setAuthState('unauthenticated');
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (authState === 'checking') {
    return null;
  }

  if (authState === 'unauthenticated') {
    const returnUrl = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?return_url=${encodeURIComponent(returnUrl)}`} replace />;
  }
  
  return <>{children}</>;
}

import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiClient, authApi } from '~/api/apiClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function hasBackendAccessTokenShape(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );
    const claims = JSON.parse(atob(paddedPayload));
    return claims?.tokenType === 'access' && Boolean(claims?.userId);
  } catch {
    return false;
  }
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

    if (!hasBackendAccessTokenShape(token)) {
      apiClient.clearAuth();
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

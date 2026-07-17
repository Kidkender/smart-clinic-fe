import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function RequireAuth({ roles = [], children }: { roles?: string[]; children: ReactNode }) {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  if (roles.length > 0 && (role == null || !roles.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

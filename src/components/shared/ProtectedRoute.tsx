import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Redirect to="/login" />;
  if (!userRole || !allowedRoles.includes(userRole)) return <Redirect to="/unauthorized" />;

  return <>{children}</>;
}

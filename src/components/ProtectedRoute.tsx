import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'inventar' | 'prodajalec')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, activeRole, availableRoles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-muted-foreground">Nalaganje...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has access through activeRole only
  const hasAccess = activeRole && allowedRoles.includes(activeRole);

  if (!hasAccess) {
    // Redirect based on user's active role
    if (activeRole === 'admin' || activeRole === 'inventar') {
      return <Navigate to="/inventar" replace />;
    } else if (activeRole === 'prodajalec') {
      return <Navigate to="/prodajalec" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

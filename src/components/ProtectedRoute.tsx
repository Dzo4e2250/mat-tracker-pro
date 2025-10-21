import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('ADMIN' | 'INVENTAR' | 'PRODAJALEC')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">Nalaganje...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && !allowedRoles.includes(role as any)) {
    // Redirect based on user's actual role
    if (role === ('ADMIN' as any) || role === 'INVENTAR') {
      return <Navigate to="/inventar" replace />;
    } else if (role === 'PRODAJALEC') {
      return <Navigate to="/prodajalec" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

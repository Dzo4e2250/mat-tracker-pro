import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (user && role === null) {
        // User exists but role not loaded yet, keep waiting
        return;
      } else if (role === ('ADMIN' as any) || role === 'INVENTAR') {
        navigate('/inventar');
      } else if (role === 'PRODAJALEC') {
        navigate('/prodajalec');
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">Nalaganje...</p>
      </div>
    );
  }

  return null;
};

export default Index;

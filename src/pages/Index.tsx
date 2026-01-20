import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ClipboardList } from 'lucide-react';

const Index = () => {
  const { user, activeRole, loading, needsRoleSelection, availableRoles, selectInitialRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !needsRoleSelection) {
      if (!user) {
        navigate('/auth');
      } else if (user && activeRole === null) {
        // User exists but role not loaded yet, keep waiting
        return;
      } else if (activeRole === 'admin' || activeRole === 'inventar') {
        navigate('/inventar');
      } else if (activeRole === 'prodajalec') {
        navigate('/prodajalec');
      }
    }
  }, [user, activeRole, loading, needsRoleSelection, navigate]);

  // Show role selection dialog
  if (!loading && needsRoleSelection && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-2xl text-white font-bold">M</span>
            </div>
            <CardTitle className="text-2xl">Izberite panel</CardTitle>
            <CardDescription>
              Imate dostop do več panelov. Izberite, s katerim želite nadaljevati.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableRoles.includes('prodajalec') && (
              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4 text-left"
                onClick={() => selectInitialRole('prodajalec')}
              >
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold">Prodajalec</div>
                  <div className="text-sm text-muted-foreground">Upravljanje predpražnikov in strank</div>
                </div>
              </Button>
            )}
            {(availableRoles.includes('inventar') || availableRoles.includes('admin')) && (
              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4 text-left"
                onClick={() => selectInitialRole(availableRoles.includes('admin') ? 'admin' : 'inventar')}
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">Inventar</div>
                  <div className="text-sm text-muted-foreground">Upravljanje zalog in naročil</div>
                </div>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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

  return null;
};

export default Index;

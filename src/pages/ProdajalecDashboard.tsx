import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function ProdajalecDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prodajalec Dashboard</h1>
            <p className="text-muted-foreground">Upravljanje mojih predpražnikov</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Odjava
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Moji predpražniki</CardTitle>
              <CardDescription>Pregled stanja</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Funkcionalnost kmalu na voljo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Na testu</CardTitle>
              <CardDescription>Predpražniki na testiranju</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Funkcionalnost kmalu na voljo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Umazani</CardTitle>
              <CardDescription>Čakajo pobiranje</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Funkcionalnost kmalu na voljo</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

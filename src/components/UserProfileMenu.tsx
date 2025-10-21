import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Shield, ShoppingBag, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function UserProfileMenu() {
  const { user, role, signOut } = useAuth();

  const getRoleIcon = () => {
    if (role === ('ADMIN' as any)) return <Shield className="h-4 w-4" />;
    if (role === 'INVENTAR') return <UserCog className="h-4 w-4" />;
    if (role === 'PRODAJALEC') return <ShoppingBag className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  const getRoleName = () => {
    if (role === ('ADMIN' as any)) return 'Administrator';
    if (role === 'INVENTAR') return 'Inventar';
    if (role === 'PRODAJALEC') return 'Prodajalec';
    return role;
  };

  const getRoleVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (role === ('ADMIN' as any)) return 'destructive';
    if (role === 'INVENTAR') return 'default';
    if (role === 'PRODAJALEC') return 'secondary';
    return 'outline';
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            <div className="flex items-center gap-2">
              {getRoleIcon()}
              <Badge variant={getRoleVariant()} className="text-xs">
                {getRoleName()}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Odjava</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

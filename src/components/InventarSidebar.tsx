import { Home, Users, QrCode, History, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Domov", url: "/inventar", icon: Home },
  { title: "Računi", url: "/inventar/accounts", icon: Users },
  { title: "QR Generator", url: "/inventar/qr-generator", icon: QrCode },
  { title: "Prošnja za testerje", url: "/inventar/tester-requests", icon: FileText },
  { title: "Zgodovina", url: "/inventar/history", icon: History },
];

export function InventarSidebar() {
  const { state } = useSidebar();
  const { role } = useAuth();

  const visibleMenuItems = menuItems.filter(item => {
    // Only ADMIN can see Accounts page
    if (item.url === '/inventar/accounts') {
      return role === ('ADMIN' as any);
    }
    return true;
  });

  return (
    <>
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <SidebarTrigger />
        <UserProfileMenu />
      </header>
      <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "hover:bg-accent/50"
                        }
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {state !== "collapsed" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}

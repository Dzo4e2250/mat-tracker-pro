import { useState } from "react";
import { Home, Users, LogOut, ShoppingCart, ChevronRight, UserCircle, Truck, ArrowRightLeft, Key, Map, Package, BarChart2, Euro, Activity } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProdajalecProfiles } from "@/hooks/useProfiles";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// Meni elementi - brez Dashboard in Analitika (ti sta ročno renderirani)
const menuItems = [
  { title: "Cenik", url: "/inventar/cenik", icon: Euro },
  { title: "Zemljevid", url: "/inventar/zemljevid", icon: Map },
  { title: "Prevzemi", url: "/inventar/prevzemi", icon: Package },
  { title: "Dostavljalci", url: "/inventar/dostavljalci", icon: Truck },
  { title: "Naročila", url: "/inventar/narocila", icon: ShoppingCart },
  { title: "Računi", url: "/inventar/accounts", icon: Users },
];

export function InventarSidebar() {
  const { state } = useSidebar();
  const { profile, signOut, availableRoles, switchRole } = useAuth();
  const { data: sellers = [] } = useProdajalecProfiles();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Check if current path is a seller page
  const isSellerPageActive = location.pathname.startsWith('/inventar/prodajalec/');

  // Check if user can switch to prodajalec panel
  const canSwitchToProdajalec = availableRoles.length > 1 && availableRoles.includes('prodajalec');

  return (
    <>
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <SidebarTrigger />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {profile?.first_name} {profile?.last_name}
          </span>
        </div>
      </header>
      <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inventar"
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "hover:bg-accent/50"
                      }
                    >
                      <Home className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Analitika - takoj pod Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inventar/analitika"
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "hover:bg-accent/50"
                      }
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>Analitika</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Aktivnost prodajalcev */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inventar/aktivnost"
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "hover:bg-accent/50"
                      }
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>Aktivnost</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Prodajalci - Collapsible */}
                <Collapsible defaultOpen={isSellerPageActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={isSellerPageActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        {state !== "collapsed" && (
                          <>
                            <span className="flex-1">Prodajalci</span>
                            <Badge variant="secondary" className="ml-auto mr-2 text-xs">
                              {sellers.length}
                            </Badge>
                            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {state !== "collapsed" && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {sellers.map((seller) => (
                            <SidebarMenuSubItem key={seller.id}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={`/inventar/prodajalec/${seller.id}`}
                                  className={({ isActive }) =>
                                    isActive
                                      ? "bg-accent text-accent-foreground font-medium"
                                      : "hover:bg-accent/50"
                                  }
                                >
                                  {seller.code_prefix && (
                                    <span className="font-mono text-xs bg-muted px-1 rounded mr-2">
                                      {seller.code_prefix}
                                    </span>
                                  )}
                                  <span className="truncate">
                                    {seller.first_name} {seller.last_name}
                                  </span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>

                {/* Other menu items */}
                {menuItems.map((item) => (
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
        <SidebarFooter>
          <SidebarMenu>
            {/* Switch to Prodajalec panel */}
            {canSwitchToProdajalec && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => switchRole('prodajalec')}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {state !== "collapsed" && <span>Preklopi v Prodajalec</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* Change Password */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setShowPasswordModal(true)}
                className="hover:bg-accent/50"
              >
                <Key className="mr-2 h-4 w-4" />
                {state !== "collapsed" && <span>Spremeni geslo</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Logout */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => signOut()}
                className="text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {state !== "collapsed" && <span>Odjava</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}

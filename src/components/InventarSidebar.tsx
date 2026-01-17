import { Home, Users, LogOut, ClipboardList, ShoppingCart, ChevronRight, UserCircle, Truck, QrCode } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProdajalecProfiles } from "@/hooks/useProfiles";
import {
  Sidebar,
  SidebarContent,
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

const menuItems = [
  { title: "Dashboard", url: "/inventar", icon: Home },
  { title: "Prevzemi", url: "/inventar/prevzemi", icon: Truck },
  { title: "Naročila", url: "/inventar/narocila", icon: ShoppingCart },
  { title: "QR Kode", url: "/inventar/qr-kode", icon: QrCode },
  { title: "Računi", url: "/inventar/accounts", icon: Users },
];

export function InventarSidebar() {
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const { data: sellers = [] } = useProdajalecProfiles();
  const location = useLocation();

  // Check if current path is a seller page
  const isSellerPageActive = location.pathname.startsWith('/inventar/prodajalec/');

  return (
    <>
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <SidebarTrigger />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {profile?.first_name} {profile?.last_name}
          </span>
          <button
            onClick={() => signOut()}
            className="p-2 hover:bg-gray-100 rounded"
            title="Odjava"
          >
            <LogOut size={18} />
          </button>
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
                {menuItems.slice(1).map((item) => (
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

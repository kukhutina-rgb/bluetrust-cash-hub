import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Users, ArrowLeftRight, Settings, LayoutDashboard, ArrowLeft, Droplets } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const adminItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users & KYC", url: "/admin/users", icon: Users },
  { title: "Transactions", url: "/admin/transactions", icon: ArrowLeftRight },
  { title: "Configuration", url: "/admin/config", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-3">
              <Droplets className="h-5 w-5 text-sidebar-primary" />
              <span className="font-display font-bold text-sm">BlueStream Admin</span>
            </div>
          )}
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={() => navigate("/")} className="hover:bg-sidebar-accent/50 text-sidebar-foreground/70">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Back to App</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

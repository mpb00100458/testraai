import { Shield, Server, Users, CreditCard, LayoutDashboard, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const handleLogout = async () => {
    await apiRequest("POST", "/api/logout");
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    setLocation("/admin/login");
  };

  if (!user) return null;

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      url: "/admin",
      roles: ["SUPER_ADMIN", "BILLING_ADMIN", "SUPPORT_ADMIN"],
    },
    {
      title: "MCP Servers",
      icon: Server,
      url: "/admin/mcp-servers",
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Users",
      icon: Users,
      url: "/admin/users",
      roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"],
    },
    {
      title: "Billing",
      icon: CreditCard,
      url: "/admin/billing",
      roles: ["SUPER_ADMIN", "BILLING_ADMIN"],
    },
  ];

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(user.systemRole || "")
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "BILLING_ADMIN":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "SUPPORT_ADMIN":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Agentium Admin</h1>
            <p className="text-xs text-muted-foreground truncate">Platform Administration</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={`w-full justify-center text-xs ${getRoleBadgeColor(user.systemRole || "")}`}
          >
            {user.systemRole?.replace("_", " ")}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full"
            data-testid="button-admin-sidebar-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

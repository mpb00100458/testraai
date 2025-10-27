import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Users, CreditCard, Server, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "BILLING_ADMIN", "SUPPORT_ADMIN"];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.systemRole && ADMIN_ROLES.includes(user.systemRole);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation("/admin/login");
    }
  }, [user, isLoading, isAdmin, setLocation]);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
      toast({ title: "Logged out successfully" });
      setLocation("/admin/login");
    } catch (error) {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getActiveTab = () => {
    if (location === "/admin") return "dashboard";
    if (location.startsWith("/admin/mcp-servers")) return "mcp-servers";
    if (location.startsWith("/admin/users")) return "users";
    if (location.startsWith("/admin/billing")) return "billing";
    return "dashboard";
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: "/admin",
      "mcp-servers": "/admin/mcp-servers",
      users: "/admin/users",
      billing: "/admin/billing",
    };
    setLocation(routes[value] || "/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">TestraAI Admin</h1>
                <p className="text-xs text-muted-foreground">Platform Administration</p>
              </div>
            </div>

            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="dashboard" data-testid="tab-admin-dashboard">
                  Dashboard
                </TabsTrigger>
                {user.systemRole === "SUPER_ADMIN" && (
                  <TabsTrigger value="mcp-servers" data-testid="tab-admin-mcp">
                    <Server className="h-4 w-4 mr-2" />
                    MCP Servers
                  </TabsTrigger>
                )}
                {(user.systemRole === "SUPER_ADMIN" || user.systemRole === "SUPPORT_ADMIN") && (
                  <TabsTrigger value="users" data-testid="tab-admin-users">
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </TabsTrigger>
                )}
                {(user.systemRole === "SUPER_ADMIN" || user.systemRole === "BILLING_ADMIN") && (
                  <TabsTrigger value="billing" data-testid="tab-admin-billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Logged in as:</span>
              <span className="font-medium">{user.firstName} {user.lastName}</span>
              <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary font-medium">
                {user.systemRole?.replace("_", " ")}
              </span>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
}

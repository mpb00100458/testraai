import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import AdminLogin from "@/pages/AdminLogin";
import Admin from "@/pages/Admin";
import AdminMCPServers from "@/pages/AdminMCPServers";
import { AdminLayout } from "@/layouts/AdminLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function AppContent() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const ADMIN_ROLES = ["SUPER_ADMIN", "BILLING_ADMIN", "SUPPORT_ADMIN"];
  const isAdmin = user?.systemRole && ADMIN_ROLES.includes(user.systemRole);

  // If loading, show loading screen
  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading admin panel...</p>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  // If not authenticated or not admin, show login
  if (!user || !isAdmin) {
    return (
      <>
        <AdminLogin />
        <Toaster />
      </>
    );
  }

  // Admin is authenticated, show admin panel
  return (
    <>
      <AdminLayout>
        <Switch>
          <Route path="/mcp-servers" component={AdminMCPServers} />
          <Route path="/users">
            {() => (
              <div className="p-6">
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-muted-foreground mt-2">Coming soon</p>
              </div>
            )}
          </Route>
          <Route path="/billing">
            {() => (
              <div className="p-6">
                <h2 className="text-2xl font-bold">Billing Management</h2>
                <p className="text-muted-foreground mt-2">Coming soon</p>
              </div>
            )}
          </Route>
          <Route path="/" component={Admin} />
        </Switch>
      </AdminLayout>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}


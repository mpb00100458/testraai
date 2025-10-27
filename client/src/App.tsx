import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Issues from "@/pages/Issues";
import Projects from "@/pages/Projects";
import Organization from "@/pages/Organization";
import Settings from "@/pages/Settings";
import Tools from "@/pages/Tools";
import ScanComparison from "@/pages/ScanComparison";
import ScanDetail from "@/pages/ScanDetail";
import AIAgent from "@/pages/AIAgent";
import ProjectDetail from "@/pages/ProjectDetail";
import MCPSettings from "@/pages/MCPSettings";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import AdminMCPServers from "@/pages/AdminMCPServers";
import { AdminLayout } from "@/layouts/AdminLayout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/ai-agent" component={AIAgent} />
      <Route path="/issues" component={Issues} />
      <Route path="/projects/:id">
        {(params) => <ProjectDetail projectId={params.id} onBack={() => window.history.back()} />}
      </Route>
      <Route path="/projects" component={Projects} />
      <Route path="/organization" component={Organization} />
      <Route path="/tools" component={Tools} />
      <Route path="/settings" component={Settings} />
      <Route path="/mcp-settings" component={MCPSettings} />
      <Route path="/admin" component={Admin} />
      <Route path="/scans/:scanId">
        {(params) => <ScanDetail scanId={params.scanId} />}
      </Route>
      <Route path="/compare/:scan1Id/:scan2Id">
        {(params) => <ScanComparison scan1Id={params.scan1Id} scan2Id={params.scan2Id} />}
      </Route>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Check if we're on an admin route
  const isAdminRoute = location.startsWith('/admin');
  const isAdminLoginRoute = location === '/admin/login';

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Switch>
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </>
    );
  }

  // Admin routes use AdminLayout
  if (isAdminRoute && !isAdminLoginRoute) {
    return (
      <>
        <AdminLayout>
          <Switch>
            <Route path="/admin/mcp-servers" component={AdminMCPServers} />
            <Route path="/admin" component={Admin} />
          </Switch>
        </AdminLayout>
        <Toaster />
      </>
    );
  }

  // AI Agent page needs full height layout without padding
  const isAIAgentPage = location === '/ai-agent';

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {isAIAgentPage ? (
              <div className="h-full">
                <Router />
              </div>
            ) : (
              <div className="container mx-auto p-6 max-w-7xl">
                <Router />
              </div>
            )}
          </main>
        </div>
      </div>
      <FloatingAIButton />
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

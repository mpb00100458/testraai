import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import MyScans from "@/pages/MyScans";
import Issues from "@/pages/Issues";
import Reports from "@/pages/Reports";
import Projects from "@/pages/Projects";
import Organization from "@/pages/Organization";
import Settings from "@/pages/Settings";
import Tools from "@/pages/Tools";
import ScanComparison from "@/pages/ScanComparison";

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
    <MainLayout>
      <Switch>
        <Route path="/scans" component={MyScans} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/issues" component={Issues} />
        <Route path="/reports" component={Reports} />
        <Route path="/projects" component={Projects} />
        <Route path="/organization" component={Organization} />
        <Route path="/tools" component={Tools} />
        <Route path="/settings" component={Settings} />
        <Route path="/compare/:scan1Id/:scan2Id">
          {(params) => <ScanComparison scan1Id={params.scan1Id} scan2Id={params.scan2Id} />}
        </Route>
        <Route path="/" component={MyScans} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Router />
      <Toaster />
    </>
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

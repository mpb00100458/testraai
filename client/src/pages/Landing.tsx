import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, FileSearch, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">Spec-1 A11y</span>
              <span className="text-xs text-muted-foreground">Accessibility Testing Platform</span>
            </div>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Automated Accessibility Testing
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover, audit, and resolve WCAG 2.2 compliance issues across your entire web estate with intelligent agents
            </p>
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <CardTitle>Intelligent Crawling</CardTitle>
                </div>
                <CardDescription>
                  Automatically discover and map all pages across your web estate with robots.txt awareness
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <CardTitle>WCAG 2.2 Audits</CardTitle>
                </div>
                <CardDescription>
                  Powered by Lighthouse and axe-core for comprehensive accessibility compliance testing
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/10 text-warning">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <CardTitle>Smart Deduplication</CardTitle>
                </div>
                <CardDescription>
                  Automatically group and deduplicate recurring issues across pages for efficient remediation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <CardTitle>Multi-Tenant & RBAC</CardTitle>
                </div>
                <CardDescription>
                  Enterprise-ready with organization isolation and role-based access control
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Multi-tenant architecture with organization management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Automated page discovery with configurable crawl budgets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Evidence capture with screenshots for every issue</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Comprehensive reports in CSV and PDF formats</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Role-based access control (Owner, Admin, Dev, Viewer)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-sm text-muted-foreground">
            Spec-1 A11y Testing Platform - Phase 1 of AI Test Engineer Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

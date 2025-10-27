import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Users, CreditCard, Activity, TrendingUp, Database } from "lucide-react";
import type { User } from "@shared/schema";
import { useLocation } from "wouter";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: "0",
      icon: Users,
      description: "Platform-wide users",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Scans",
      value: "0",
      icon: Activity,
      description: "Running accessibility scans",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "MCP Servers",
      value: "0",
      icon: Server,
      description: "Configured servers",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Revenue",
      value: "$0",
      icon: TrendingUp,
      description: "Monthly recurring",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  const adminSections = [
    {
      title: "MCP Servers",
      description: "Configure Model Context Protocol servers for AI agents",
      icon: Server,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-500/10",
      details: "Manage global server configurations, transport types, and tool availability for the AI agent system.",
      url: "/admin/mcp-servers",
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "User Management",
      description: "Manage user accounts, roles, and access control",
      icon: Users,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      details: "View all platform users, update account status, and assign administrator roles for system access.",
      url: "/admin/users",
      roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"],
    },
    {
      title: "Billing Management",
      description: "Monitor subscriptions, invoices, and payments",
      icon: CreditCard,
      iconColor: "text-green-500",
      iconBg: "bg-green-500/10",
      details: "Track subscription plans, payment history, billing status, and revenue analytics across the platform.",
      url: "/admin/billing",
      roles: ["SUPER_ADMIN", "BILLING_ADMIN"],
    },
  ];

  const visibleSections = adminSections.filter((section) =>
    section.roles.includes(user.systemRole || "")
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-admin-title">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName}! Here's an overview of your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Sections */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Administration</h2>
          <p className="text-sm text-muted-foreground">
            Manage platform settings and configurations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section) => (
            <Card
              key={section.title}
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => setLocation(section.url)}
              data-testid={`card-admin-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${section.iconBg}`}>
                    <section.icon className={`h-6 w-6 ${section.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-1">{section.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.details}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-1">Your Role</p>
              <p className="text-sm text-muted-foreground">
                {user.systemRole?.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Email</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Access Level</p>
              <p className="text-sm text-muted-foreground">
                {user.systemRole === "SUPER_ADMIN" && "Full platform access"}
                {user.systemRole === "BILLING_ADMIN" && "Billing and payments"}
                {user.systemRole === "SUPPORT_ADMIN" && "User management"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <p className="text-sm text-emerald-500">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

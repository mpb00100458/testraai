import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Globe, 
  ChevronDown, 
  ChevronRight,
  BarChart3,
  Settings,
  Video,
  FileText,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    icon: Globe,
    label: "My sites",
    path: "/",
  },
  {
    icon: BarChart3,
    label: "Monitor Scans",
    path: "/scans",
    children: [
      { label: "My Scans", path: "/scans" },
      { label: "Settings", path: "/scans/settings" },
      { label: "Monitor Plan", path: "/scans/plan" },
      { label: "Watch a video", path: "/scans/video" },
    ],
  },
  {
    icon: FileText,
    label: "Documents (PDF)",
    path: "/documents",
  },
  {
    icon: Wand2,
    label: "Editor tools",
    path: "/editor",
  },
];

export function LeftSidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Monitor Scans"]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="w-60 bg-background border-r border-border h-full flex flex-col">
      {/* Site Selector */}
      <div className="p-4 border-b border-border">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border hover-elevate">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">nymag.com</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpanded(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover-elevate",
                    expandedItems.includes(item.label) && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className={cn(
                      expandedItems.includes(item.label) ? "text-primary font-medium" : ""
                    )}>{item.label}</span>
                  </div>
                  {expandedItems.includes(item.label) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedItems.includes(item.label) && (
                  <div className="ml-7 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        href={child.path}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-md hover-elevate",
                          isActive(child.path)
                            ? "text-primary font-medium"
                            : "text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          {child.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.path}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover-elevate",
                  isActive(item.path)
                    ? "text-primary font-medium bg-primary/5"
                    : "text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

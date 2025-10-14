import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { ScanHistoryTable } from "@/components/ScanHistoryTable";
import { Globe } from "lucide-react";

export default function MyScans() {
  const { data: estates } = useQuery<any[]>({
    queryKey: ["/api/estates"],
    queryFn: async () => {
      const response = await fetch("/api/estates");
      if (!response.ok) throw new Error("Failed to fetch estates");
      return response.json();
    },
  });

  const firstEstate = estates?.[0];

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Monitor Scans</span>
          <span>/</span>
          <span className="text-foreground font-medium">My Scans</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Scans</h1>
          <Button className="bg-primary hover:bg-primary/90" data-testid="button-new-scan">
            <Plus className="h-4 w-4 mr-2" />
            Start a new scan
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {firstEstate ? (
          <div className="space-y-6">
            {/* Site Info Card */}
            <div className="bg-card border border-card-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">{firstEstate.name}</h2>
                    <p className="text-sm text-muted-foreground">{firstEstate.baseUrl}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid="button-run-scan">
                  Start a new scan
                </Button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    className="pl-10"
                    data-testid="input-search-scans"
                  />
                </div>
              </div>

              {/* Scan History Table */}
              <ScanHistoryTable estateId={firstEstate.id} estateName={firstEstate.name} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <Globe className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sites added yet</h3>
            <p className="text-muted-foreground mb-4">Add your first website to start scanning</p>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add new site
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ColorContrastAnalyzer } from "@/components/ColorContrastAnalyzer";

export default function Tools() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Accessibility Tools</h1>
        <p className="text-lg text-muted-foreground">Utilities to test and improve web accessibility</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ColorContrastAnalyzer />
        
        {/* Placeholder for future tools */}
        <div className="space-y-6">
          <div className="p-6 border border-dashed border-muted-foreground/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">More tools coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

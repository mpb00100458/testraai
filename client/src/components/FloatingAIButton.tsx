import { Bot } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function FloatingAIButton() {
  const [location, setLocation] = useLocation();
  
  // Hide on AI Agent page since we're already there
  if (location === '/ai-agent') {
    return null;
  }

  return (
    <Button
      size="icon"
      onClick={() => setLocation('/ai-agent')}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-50"
      data-testid="button-floating-ai"
    >
      <Bot className="h-6 w-6" />
    </Button>
  );
}

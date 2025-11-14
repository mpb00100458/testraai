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
    <button
      onClick={() => setLocation('/ai-agent')}
      className="fixed h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-50 flex items-center justify-center"
      style={{ bottom: '1.5rem', right: '1.5rem' }}
      data-testid="button-floating-ai"
    >
      <Bot className="h-6 w-6" />
    </button>
  );
}

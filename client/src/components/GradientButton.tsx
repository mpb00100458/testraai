import { Button, ButtonProps } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  showIcon?: boolean;
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, showIcon = true, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "gradient-bg text-white border-0 hover:opacity-90 transition-opacity gradient-glow",
          className
        )}
        {...props}
      >
        {showIcon && <Sparkles className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    );
  }
);

GradientButton.displayName = "GradientButton";

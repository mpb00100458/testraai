import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Shield, Activity, FileSearch, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GradientButton } from "@/components/GradientButton";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Testing Agent",
    description: "Conversational AI assistant for natural language accessibility testing, instant WCAG guidance, and intelligent scan orchestration",
  },
  {
    icon: Shield,
    title: "Automated Compliance Audits",
    description: "Continuous WCAG 2.1 A/AA monitoring with intelligent browser automation and comprehensive validation",
  },
  {
    icon: Activity,
    title: "Real-Time Monitoring",
    description: "Live scan visualization with instant feedback, session recording, and complete audit trails",
  },
  {
    icon: FileSearch,
    title: "Executive Reporting",
    description: "Multi-format compliance reports with actionable insights for legal and development teams",
  },
  {
    icon: AlertCircle,
    title: "Workflow Integration",
    description: "Seamless issue tracking and remediation management with role-based team collaboration",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");

  // Auto-rotate slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await apiRequest("POST", "/api/login", {
        email: loginEmail,
        password: loginPassword,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid credentials");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      navigate("/dashboard");
      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!registerEmail || !registerPassword) {
        throw new Error("Email and password are required");
      }
      if (registerPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const res = await apiRequest("POST", "/api/register", {
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      navigate("/dashboard");
      toast({
        title: "Welcome to TestraAI!",
        description: "Account created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentFeature = features[currentSlide];
  const Icon = currentFeature.icon;

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left Column - Auth Forms */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TestraAI
              </span>
              <span className="text-sm text-muted-foreground">Accessibility Compliance Platform</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold">
                {isLogin ? "Welcome Back!" : "Get Started"}
              </h1>
              <p className="text-muted-foreground">
                {isLogin 
                  ? "Please enter login details below" 
                  : "Create your account to start testing"}
              </p>
            </div>

            {isLogin ? (
              <form onSubmit={(e) => loginMutation.mutate(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-12"
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-12"
                    data-testid="input-login-password"
                  />
                </div>
                <GradientButton
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </GradientButton>
              </form>
            ) : (
              <form onSubmit={(e) => registerMutation.mutate(e)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-firstname" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="register-firstname"
                      type="text"
                      placeholder="John"
                      value={registerFirstName}
                      onChange={(e) => setRegisterFirstName(e.target.value)}
                      className="h-12"
                      data-testid="input-register-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-lastname" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="register-lastname"
                      type="text"
                      placeholder="Doe"
                      value={registerLastName}
                      onChange={(e) => setRegisterLastName(e.target.value)}
                      className="h-12"
                      data-testid="input-register-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="h-12"
                    autoComplete="email"
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="h-12"
                    data-testid="input-register-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>
                <GradientButton
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={registerMutation.isPending}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </GradientButton>
              </form>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-auth-mode"
              >
                {isLogin ? (
                  <>
                    Don't have an account?{" "}
                    <span className="text-blue-600 font-semibold">Sign Up</span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span className="text-blue-600 font-semibold">Sign in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Animated Feature Cards */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100 dark:from-gray-900 dark:to-purple-950 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5MzMzZWEiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDMwaC0yVjBoMnYzMHptMCAzMHYtMmgtMnYyaDJ6TTAgMzB2LTJoMzB2Mkgwem02MCAwdi0ySDMwdjJoM3ptMC0zMHYySDMwVjBoMzB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 max-w-lg w-full">
          <div className="bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-900 rounded-3xl p-8 shadow-2xl transition-all duration-500 min-h-[480px] flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Icon className="h-12 w-12 text-white" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  {currentFeature.title}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {currentFeature.description}
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? "w-8 bg-gradient-to-r from-violet-500 to-purple-600" 
                      : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                  data-testid={`button-slide-${index}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm italic">
              Ensure digital inclusivity with AI-powered accessibility testing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, FileSearch, Shield, Loader2, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GradientButton } from "@/components/GradientButton";

export default function Landing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");

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

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left Column - Auth Forms */}
      <div className="flex items-center justify-center p-8 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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

          <Card className="!shadow-md">
            <CardHeader>
              <CardTitle>{isLogin ? "Sign In" : "Sign Up"}</CardTitle>
              <CardDescription>
                {isLogin 
                  ? "Access your compliance dashboard" 
                  : "Start your accessibility testing journey"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLogin ? (
                <form onSubmit={(e) => loginMutation.mutate(e)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                  <GradientButton
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login-submit"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </GradientButton>
                </form>
              ) : (
                <form onSubmit={(e) => registerMutation.mutate(e)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name</Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        placeholder="John"
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        data-testid="input-register-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        placeholder="Doe"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      autoComplete="email"
                      data-testid="input-register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      data-testid="input-register-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters
                    </p>
                  </div>
                  <GradientButton
                    type="submit"
                    className="w-full"
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

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-auth-mode"
                >
                  {isLogin ? (
                    <>
                      Don't have an account?{" "}
                      <span className="text-blue-600 font-semibold">Sign up</span>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <span className="text-blue-600 font-semibold">Sign in</span>
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - Hero Features */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-violet-100 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-12">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">
              Enterprise Accessibility Compliance Platform
            </h2>
            <p className="text-lg text-muted-foreground">
              Ensure digital inclusivity and regulatory compliance with automated WCAG 2.1 Level A/AA testing powered by intelligent AI analysis
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Automated Compliance Audits</h3>
                <p className="text-sm text-muted-foreground">
                  Continuous WCAG 2.1 A/AA monitoring with browser automation and axe-core validation engine
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Real-Time Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Live scan visualization with instant feedback, session recording, and complete audit trails
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <FileSearch className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Executive Reporting</h3>
                <p className="text-sm text-muted-foreground">
                  Multi-format compliance reports with actionable insights for legal and development teams
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Workflow Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Seamless issue tracking and remediation management with role-based team collaboration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

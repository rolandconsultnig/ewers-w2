import React, { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield, LogIn, Lock, User, Info, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Import the IPCR logo
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";

const LOGIN_FORM_KEY = "ewer_login_draft";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function getStoredDraft(): Partial<LoginFormData> {
  try {
    const s = sessionStorage.getItem(LOGIN_FORM_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function saveDraft(data: Partial<LoginFormData>) {
  try {
    sessionStorage.setItem(LOGIN_FORM_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading, loginMutation } = useAuth();
  const hasRedirected = useRef(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: getStoredDraft().username ?? "",
      password: getStoredDraft().password ?? "",
    },
  });

  // Persist form values on unmount so they survive remounts
  useEffect(() => {
    return () => {
      const v = loginForm.getValues();
      if (v.username || v.password) saveDraft(v);
    };
  }, [loginForm]);

  const onLoginSubmit = async (data: LoginFormData) => {
    sessionStorage.removeItem(LOGIN_FORM_KEY);
    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/dashboard");
      },
    });
  };

  // Reset redirect guard when user logs out
  useEffect(() => {
    if (!user) hasRedirected.current = false;
  }, [user]);

  // Redirect to dashboard only when logged in - run once per user, avoid loops
  useEffect(() => {
    if (isLoading || !user || location !== "/auth") return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    navigate("/dashboard", { replace: true });
  }, [user, isLoading, location, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center p-4">
      <div className="container max-w-screen-xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <img src={ipcr_logo} alt="IPCR Logo" className="h-12 w-12" />
                <div>
                  <CardTitle className="text-xl font-bold text-blue-600">IPCR Official Portal</CardTitle>
                  <CardDescription className="text-sm">
                    Login required for authorized personnel
                  </CardDescription>
                </div>
              </div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </Link>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <div className="flex">
                <Shield className="h-6 w-6 text-blue-500 mr-2" />
                <div>
                  <h4 className="font-semibold text-blue-800">Secure Access</h4>
                  <p className="text-sm text-blue-700">
                    This portal is restricted to IPCR staff and authorized partners only.
                  </p>
                </div>
              </div>
            </div>
            
            <Form {...loginForm}>
              <form 
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input 
                            placeholder="Enter your username" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                    Forgot password?
                  </Link>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <LogIn className="mr-2 h-5 w-5" />
                      Login to Dashboard
                    </span>
                  )}
                </Button>
                
                <div className="text-center text-sm text-gray-500 mt-4">
                  <p>For access issues, please contact your system administrator</p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="hidden md:flex flex-col text-center md:text-left space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-blue-600 mb-4">
              IPCR Early Warning & Early Response System
            </h1>
            <p className="text-gray-600 text-lg">
              Strengthening Nigeria's capacity for the promotion of peace and conflict prevention
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-lg shadow-sm border border-blue-100">
              <div className="flex items-center mb-2">
                <Info className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Data-Driven Analysis</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Using cutting-edge analytics to identify early warning signs of conflict
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-lg shadow-sm border border-blue-100">
              <div className="flex items-center mb-2">
                <Info className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Rapid Response</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Coordinated intervention mechanisms to address emerging threats
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-lg shadow-sm border border-blue-100">
              <div className="flex items-center mb-2">
                <Info className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Field Operations</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Direct engagement with communities through trained peace ambassadors
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-lg shadow-sm border border-blue-100">
              <div className="flex items-center mb-2">
                <Info className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Policy Advocacy</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Influencing government policies to address root causes of conflict
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

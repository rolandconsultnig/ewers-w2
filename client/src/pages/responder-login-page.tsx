import React, { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield, LogIn, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function ResponderLoginPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading, loginMutation } = useAuth();
  const hasRedirected = useRef(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => navigate("/responder"),
    });
  };

  useEffect(() => {
    if (!user) hasRedirected.current = false;
  }, [user]);

  useEffect(() => {
    if (isLoading || !user || location !== "/responder/login") return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    navigate("/responder", { replace: true });
  }, [user, isLoading, location, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-6 shadow-sm">
        <Link href="/responder">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-teal-600 hover:bg-teal-50 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to portal
          </Button>
        </Link>
        <Link href="/responder" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-slate-600">Responder Portal</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="px-8 pt-10 pb-6 border-b border-slate-100">
              <div className="flex justify-center mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500 text-white">
                  <Shield className="h-7 w-7" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center text-slate-800 tracking-tight">
                Responder sign in
              </h1>
              <p className="text-slate-600 text-sm text-center mt-2">
                Sign in to view assignments and the incident map
              </p>
            </div>

            <div className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <Input
                              placeholder="Your username"
                              className="pl-10 h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-600 text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <Input
                              type="password"
                              placeholder="Your password"
                              className="pl-10 h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-600 text-sm" />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg gap-2 shadow-sm"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <LogIn className="h-5 w-5" />
                        Sign in
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          {loginMutation.isError && (
            <p className="mt-4 text-center text-sm text-red-600">
              {loginMutation.error?.message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

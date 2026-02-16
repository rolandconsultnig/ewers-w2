import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Global 401 handling: clear user and redirect to login to prevent error loops and page "resetting"
if (typeof window !== "undefined") {
  queryClient.getQueryCache().subscribe((event) => {
    if (event?.type !== "updated") return;
    const q = event.query;
    if (q.state.status !== "error" || !q.state.error?.message?.includes("401")) return;
    // Skip for the auth user query (it uses returnNull and shouldn't error)
    if (Array.isArray(q.queryKey) && q.queryKey[0] === "/api/user") return;
    queryClient.setQueryData(["/api/user"], null);
    if (window.location.pathname !== "/auth") {
      window.location.replace("/auth");
    }
  });
}

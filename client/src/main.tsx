import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/dialog-fix.css";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { SocketProvider } from "@/contexts/SocketContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { I18nProvider } from "@/contexts/I18nContext";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

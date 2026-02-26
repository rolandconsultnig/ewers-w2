import { useState, ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";
import VoiceAssistant from "@/components/VoiceAssistant";
import { VoiceA11yProvider } from "@/contexts/VoiceA11yContext";
import { useAuth } from "@/hooks/use-auth";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  
  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  
  return (
    <VoiceA11yProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        {!!user && <VoiceAssistant pageTitle={title} />}

        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          closeMobileMenu={closeMobileMenu}
        />
        
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar 
            openMobileMenu={openMobileMenu} 
            title={title}
          />
          
          <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
          
          <Footer />
        </div>
      </div>
    </VoiceA11yProvider>
  );
}

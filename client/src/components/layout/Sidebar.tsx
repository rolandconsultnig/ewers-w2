import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Database, 
  LineChart, 
  BarChart3, 
  Map, 
  Bell, 
  AlertTriangle,
  Search,
  Shield,
  Workflow, 
  Folder, 
  Users, 
  Settings, 
  LogOut,
  X,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  MessageCircle,
  Brain,
  MessageSquare,
  Phone,
  Send,
  Share2,
  Twitter,
  Facebook,
  Instagram,
  Video,
  MessageSquareDashed,
  Sparkles,
  Bot,
  Mail,
  Globe,
  CheckCircle2,
  Download,
  Mic,
  Leaf,
  Vote,
  UserCircle,
  Building2,
  Swords,
  Calendar
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

// Import the IPCR logo
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
}

export default function Sidebar({ isMobileMenuOpen, closeMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t } = useI18n();

  const isActive = (path: string) => location === path;

  // Define module groups for the sidebar
  const moduleGroups = [
    {
      id: "mainNavigation",
      title: t("layout.sidebar.mainNavigation"),
      items: [
        { path: "/dashboard", label: t("nav.dashboard"), icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
        { path: "/executive", label: t("nav.executiveDashboard"), icon: <BarChart3 className="mr-3 h-5 w-5" /> },
        { path: "/internal", label: t("nav.situationRoom"), icon: <Bell className="mr-3 h-5 w-5" /> },
        { path: "/crises", label: t("nav.crisisManagement"), icon: <AlertTriangle className="mr-3 h-5 w-5" /> },
        { path: "/map", label: t("nav.nigeriaCrisisMap"), icon: <Map className="mr-3 h-5 w-5" /> },
        { path: "/search", label: "Search", icon: <Search className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "aiAssistant",
      title: t("layout.sidebar.aiAssistant"),
      items: [
        { path: "/ai-analysis", label: t("nav.aiAnalysis"), icon: <Sparkles className="mr-3 h-5 w-5" /> },
        { path: "/ai-prediction", label: t("nav.predictiveModels"), icon: <Bot className="mr-3 h-5 w-5" /> },
        { path: "/ai-advisor", label: t("nav.responseAdvisor"), icon: <Globe className="mr-3 h-5 w-5" /> },
        { path: "/peace-indicators", label: "Peace Opportunity Indicators", icon: <Leaf className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "dataManagement",
      title: (() => {
        const label = t("layout.sidebar.dataManagement");
        return label === "layout.sidebar.dataManagement" ? "Data Management" : label;
      })(),
      items: [
        { path: "/data-collection", label: t("nav.dataCollection"), icon: <Download className="mr-3 h-5 w-5" /> },
        { path: "/data-processing", label: t("nav.dataProcessing"), icon: <Settings className="mr-3 h-5 w-5" /> },
        { path: "/collected-data", label: "Collected Data", icon: <Database className="mr-3 h-5 w-5" /> },
        { path: "/processed-data", label: "Processed Data", icon: <Brain className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "electionMonitoring",
      title: "Election Monitoring",
      items: [
        { path: "/election-monitoring", label: "Dashboard", icon: <Vote className="mr-3 h-5 w-5" /> },
        { path: "/election-monitoring/elections", label: "Elections", icon: <Calendar className="mr-3 h-5 w-5" /> },
        { path: "/election-monitoring/parties", label: "Political Parties", icon: <Building2 className="mr-3 h-5 w-5" /> },
        { path: "/election-monitoring/politicians", label: "Politicians", icon: <UserCircle className="mr-3 h-5 w-5" /> },
        { path: "/election-monitoring/actors", label: "Actors & Non-Actors", icon: <Users className="mr-3 h-5 w-5" /> },
        { path: "/election-monitoring/violence", label: "Violence & Events", icon: <Swords className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "riskAssessment",
      title: t("layout.sidebar.riskAssessment"),
      items: [
        { path: "/analysis", label: t("nav.riskAssessment"), icon: <LineChart className="mr-3 h-5 w-5" /> },
        { path: "/visualization", label: t("nav.visualization"), icon: <Map className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "responseManagement",
      title: t("layout.sidebar.responseManagement"),
      items: [
        { path: "/alerts", label: t("nav.alerts"), icon: <Bell className="mr-3 h-5 w-5" /> },
        { path: "/incident-review", label: "Incident Review", icon: <CheckCircle2 className="mr-3 h-5 w-5" /> },
        { path: "/voice-incident", label: "Voice Incident Report", icon: <Mic className="mr-3 h-5 w-5" /> },
        { path: "/case-management", label: t("nav.caseManagement"), icon: <Folder className="mr-3 h-5 w-5" /> },
        { path: "/response-plans", label: "Response Plans", icon: <Workflow className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "communications",
      title: t("layout.sidebar.communications"),
      items: [
        { path: "/chat", label: "Chat", icon: <MessageCircle className="mr-3 h-5 w-5" /> },
        { path: "/email", label: "Internal Email", icon: <Mail className="mr-3 h-5 w-5" /> },
        { path: "/calls", label: "Voice & Video Calls", icon: <Video className="mr-3 h-5 w-5" /> },
        { path: "/sms", label: t("nav.smsManagement"), icon: <MessageSquare className="mr-3 h-5 w-5" /> },
        { path: "/sms/compose", label: t("nav.composeSms"), icon: <MessageSquareDashed className="mr-3 h-5 w-5" /> },
        { path: "/sms/templates", label: t("nav.smsTemplates"), icon: <MessageCircle className="mr-3 h-5 w-5" /> },
        { path: "/sms/logs", label: t("nav.messagingLogs"), icon: <FileText className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "socialMedia",
      title: t("layout.sidebar.socialMedia"),
      items: [
        { path: "/social-media", label: t("nav.socialDashboard"), icon: <Share2 className="mr-3 h-5 w-5" /> },
        { path: "/social-media/twitter", label: "X (Twitter)", icon: <Twitter className="mr-3 h-5 w-5" /> },
        { path: "/social-media/facebook", label: "Facebook", icon: <Facebook className="mr-3 h-5 w-5" /> },
        { path: "/social-media/instagram", label: "Instagram", icon: <Instagram className="mr-3 h-5 w-5" /> },
        { path: "/social-media/tiktok", label: "TikTok", icon: <Video className="mr-3 h-5 w-5" /> },
      ]
    },
    {
      id: "administration",
      title: t("layout.sidebar.administration"),
      items: [
        { path: "/audit-logs", label: t("nav.auditLogs"), icon: <Shield className="mr-3 h-5 w-5" /> },
        { path: "/enterprise-settings", label: t("nav.enterpriseSettings"), icon: <Settings className="mr-3 h-5 w-5" /> },
        { path: "/user-management", label: t("nav.userManagement"), icon: <Users className="mr-3 h-5 w-5" /> },
        { path: "/integrations", label: t("nav.integrations"), icon: <LinkIcon className="mr-3 h-5 w-5" /> },
        { path: "/reporting", label: t("nav.reporting"), icon: <FileText className="mr-3 h-5 w-5" /> },
        { path: "/settings", label: t("nav.settings"), icon: <Settings className="mr-3 h-5 w-5" /> },
      ]
    }
  ];
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    mainNavigation: true,
    aiAssistant: true,
    dataManagement: true,
    electionMonitoring: true,
    riskAssessment: true,
    responseManagement: true,
    communications: true,
    socialMedia: true,
    administration: true
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const sidebarClasses = `md:flex md:flex-shrink-0 transition-transform duration-300 fixed md:relative inset-y-0 left-0 z-50 transform ${
    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  }`;

  return (
    <aside className={sidebarClasses}>
      <div className="flex flex-col w-64 border-r border-red-600/30 bg-gradient-to-b from-green-800 to-green-700 h-full">
        {/* Logo and Header */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-red-600/30 bg-gradient-to-r from-green-800 to-green-700">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <img src={ipcr_logo} alt="IPCR Logo" className="h-10 w-10" />
              <span className="font-bold text-white text-lg ml-2">IPCR</span>
            </div>
            <button 
              className="md:hidden text-white/80 hover:text-white" 
              onClick={closeMobileMenu}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <h2 className="font-semibold text-white">EWERS</h2>
            <p className="text-xs text-white/80">{t("layout.sidebar.tagline")}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="overflow-y-auto flex-grow">
          {moduleGroups.map((group) => (
            <div key={group.id} className="mb-3">
              <div 
                className="px-3 pt-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedGroups(prev => ({
                  ...prev,
                  [group.id]: !prev[group.id]
                }))}
              >
                <p className="px-4 text-xs font-semibold text-white/90 uppercase tracking-wider">
                  {group.title}
                </p>
                <span className="text-xs text-white/70">
                  {expandedGroups[group.id] ? '▼' : '▶'}
                </span>
              </div>
              
              {expandedGroups[group.id] && (
                <nav className="mt-2 px-2 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center pl-4 py-2 pr-4 text-sm font-medium rounded-md ${
                        isActive(item.path)
                          ? "bg-white/10 text-white border-l-4 border-red-500"
                          : "text-white/85 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          ))}

          <div className="px-3 pt-6">
            <p className="px-4 text-xs font-semibold text-white/90 uppercase tracking-wider">
              {t("layout.sidebar.externalLinks")}
            </p>
            <div className="mt-2 px-2 space-y-1">
              <a 
                href="https://ipcr.gov.ng" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center pl-4 py-3 pr-4 font-medium rounded-md text-white/85 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="mr-3 h-5 w-5" />
                {t("layout.sidebar.ipcrWebsite")}
              </a>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="flex-shrink-0 border-t border-red-600/30 p-4 bg-gradient-to-r from-green-800 to-green-700">
          <div className="flex items-center">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback className="bg-green-900 text-white">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user?.fullName || user?.username}</p>
              <p className="text-xs font-medium text-white/80">{user?.role || t("layout.sidebar.official")}</p>
            </div>
            <div className="ml-auto">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-white/85 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

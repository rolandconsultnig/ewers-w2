import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import PeaceTrackerDashboard from "@/pages/PeaceTrackerDashboard";
import PeaceTrackerInternalDashboard from "@/pages/PeaceTrackerInternalDashboard";
import CrisisPage from "@/pages/CrisisPage";
import DataCollectionPage from "@/pages/data-collection-page";
import DataProcessingPage from "@/pages/data-processing-page";
import AnalysisPage from "@/pages/analysis-page";
import RiskAssessmentPage from "@/pages/risk-assessment-page";
import VisualizationPage from "@/pages/visualization-page";
import AlertsPage from "@/pages/alerts-page-new";
import CaseManagementPage from "@/pages/case-management-page";
import UserManagementPage from "@/pages/user-management-page";
import IntegrationsPage from "@/pages/integrations-page";
import ReportingPage from "@/pages/reporting-page";
import ResponsePlansPage from "./pages/response-plans-page";
import SettingsPage from "./pages/settings-page";
import IncidentReviewPage from "./pages/incident-review-page";
import CollectedDataPage from "./pages/collected-data-page";
import ProcessedDataPage from "./pages/processed-data-page";
import VoiceIncidentPage from "./pages/voice-incident-page";
import SmsPage from "@/pages/sms-page";
import SocialMediaPage from "@/pages/social-media-page";
import AiAnalysisPage from "@/pages/ai-analysis-page";
import AiPredictionPage from "@/pages/ai-prediction-page";
import PeaceIndicatorsPage from "@/pages/peace-indicators-page";
import ReportIncidentPage from "@/pages/report-incident-page";
import MapPage from "@/pages/map-page";
import ExecutiveDashboardPage from "@/pages/executive-dashboard-page";
import AuditLogsPage from "@/pages/audit-logs-page";
import EnterpriseSettingsPage from "@/pages/enterprise-settings-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import SearchPage from "@/pages/search-page";
import ChatPage from "@/pages/chat-page";
import EmailPage from "@/pages/email-page";
import CallsPage from "@/pages/calls-page";
import { ProtectedRoute, RoleProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/incidents" component={CaseManagementPage} />
      <ProtectedRoute path="/incident-review" component={IncidentReviewPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/report-incident" component={ReportIncidentPage} />
      <Route path="/map" component={MapPage} />
      <ProtectedRoute path="/search" component={SearchPage} />
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/email" component={EmailPage} />
      <ProtectedRoute path="/calls" component={CallsPage} />
      <ProtectedRoute path="/dashboard" component={PeaceTrackerDashboard} />
      <ProtectedRoute path="/executive" component={ExecutiveDashboardPage} />
      <ProtectedRoute path="/internal" component={PeaceTrackerInternalDashboard} />
      <ProtectedRoute path="/crises" component={CrisisPage} />
      
      {/* Data Collection & Processing */}
      <ProtectedRoute path="/data-collection" component={DataCollectionPage} />
      <ProtectedRoute path="/data-processing" component={DataProcessingPage} />
      <ProtectedRoute path="/collected-data" component={CollectedDataPage} />
      <ProtectedRoute path="/processed-data" component={ProcessedDataPage} />
      
      {/* AI Assistant */}
      <ProtectedRoute path="/ai-analysis" component={AiAnalysisPage} />
      <ProtectedRoute path="/ai-prediction" component={AiPredictionPage} />
      <ProtectedRoute path="/ai-advisor" component={AiAnalysisPage} />
      <ProtectedRoute path="/peace-indicators" component={PeaceIndicatorsPage} />
      
      {/* Risk Assessment */}
      <ProtectedRoute path="/analysis" component={RiskAssessmentPage} />
      <ProtectedRoute path="/visualization" component={VisualizationPage} />
      
      {/* Response Management */}
      <ProtectedRoute path="/alerts" component={AlertsPage} />
      <ProtectedRoute path="/case-management" component={CaseManagementPage} />
      <ProtectedRoute path="/response-plans" component={ResponsePlansPage} />
      <ProtectedRoute path="/voice-incident" component={VoiceIncidentPage} />
      
      {/* Communications - SMS Management */}
      <ProtectedRoute path="/sms" component={SmsPage} />
      <ProtectedRoute path="/sms/compose" component={SmsPage} />
      <ProtectedRoute path="/sms/templates" component={SmsPage} />
      <ProtectedRoute path="/sms/logs" component={SmsPage} />
      
      {/* Social Media */}
      <ProtectedRoute path="/social-media" component={SocialMediaPage} />
      <ProtectedRoute path="/social-media/twitter" component={SocialMediaPage} />
      <ProtectedRoute path="/social-media/facebook" component={SocialMediaPage} />
      <ProtectedRoute path="/social-media/instagram" component={SocialMediaPage} />
      <ProtectedRoute path="/social-media/tiktok" component={SocialMediaPage} />
      
      {/* Administration */}
      <RoleProtectedRoute path="/audit-logs" component={AuditLogsPage} allowedRoles={["admin"]} minSecurityLevel={5} />
      <RoleProtectedRoute path="/enterprise-settings" component={EnterpriseSettingsPage} allowedRoles={["admin"]} minSecurityLevel={5} />
      <RoleProtectedRoute path="/user-management" component={UserManagementPage} allowedRoles={["admin"]} minSecurityLevel={5} />
      <ProtectedRoute path="/integrations" component={IntegrationsPage} />
      <ProtectedRoute path="/reporting" component={ReportingPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div>
      <Router />
      <Toaster />
    </div>
  );
}

export default App;

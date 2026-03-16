import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import AboutIpcrPage from "@/pages/about-ipcr-page";
import DirectorGeneralPage from "@/pages/director-general-page";
import PeaceInitiativesPage from "@/pages/peace-initiatives-page";
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
import CmsManagementPage from "@/pages/cms-management-page";
import IntegrationsPage from "@/pages/integrations-page";
import ReportingPage from "@/pages/reporting-page";
import ResponsePlansPage from "./pages/response-plans-page";
import ResponderPortalPage from "./pages/responder-portal-page";
import ResponderLoginPage from "./pages/responder-login-page";
import IncidentDetailPage from "./pages/incident-detail-page";
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
import ReportByVoicePage from "@/pages/report-by-voice-page";
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
import CallsJoinPage from "@/pages/calls-join-page";
import ElectionMonitoringDashboard from "@/pages/election-monitoring/election-monitoring-dashboard";
import ElectionElectionsPage from "@/pages/election-monitoring/election-elections-page";
import ElectionPartiesPage from "@/pages/election-monitoring/election-parties-page";
import ElectionPoliticiansPage from "@/pages/election-monitoring/election-politicians-page";
import ElectionActorsPage from "@/pages/election-monitoring/election-actors-page";
import ElectionViolencePage from "@/pages/election-monitoring/election-violence-page";
import ElectionNewsFeedPage from "@/pages/election-monitoring/election-news-feed-page";
import { ProtectedRoute, RoleProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/about-ipcr" component={AboutIpcrPage} />
      <Route path="/director-general" component={DirectorGeneralPage} />
      <Route path="/peace-initiatives" component={PeaceInitiativesPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/incidents/:id" component={IncidentDetailPage} />
      <Route path="/incidents" component={CaseManagementPage} />
      <ProtectedRoute path="/incident-review" component={IncidentReviewPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/report-incident" component={ReportIncidentPage} />
      <Route path="/report-by-voice" component={ReportByVoicePage} />
      <Route path="/map" component={MapPage} />
      <ProtectedRoute path="/search" component={SearchPage} />
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/email" component={EmailPage} />
      <ProtectedRoute path="/calls" component={CallsPage} />
      <Route path="/calls/join/:callId" component={CallsJoinPage} />
      <ProtectedRoute path="/dashboard" component={PeaceTrackerDashboard} />
      <ProtectedRoute path="/executive" component={ExecutiveDashboardPage} />
      <ProtectedRoute path="/internal" component={PeaceTrackerInternalDashboard} />
      <ProtectedRoute path="/crises" component={CrisisPage} />
      
      {/* Data Collection & Processing */}
      <RoleProtectedRoute path="/data-collection" component={DataCollectionPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/data-processing" component={DataProcessingPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/collected-data" component={CollectedDataPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/processed-data" component={ProcessedDataPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      
      {/* AI Assistant */}
      <RoleProtectedRoute path="/ai-analysis" component={AiAnalysisPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/ai-prediction" component={AiPredictionPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/ai-advisor" component={AiAnalysisPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/peace-indicators" component={PeaceIndicatorsPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      
      {/* Risk Assessment */}
      <RoleProtectedRoute path="/analysis" component={RiskAssessmentPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/visualization" component={VisualizationPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      
      {/* Response Management */}
      <RoleProtectedRoute path="/alerts" component={AlertsPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/case-management" component={CaseManagementPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/response-plans" component={ResponsePlansPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <Route path="/responder/login" component={ResponderLoginPage} />
      <Route path="/responder/agency/:agencySlug" component={ResponderPortalPage} />
      <Route path="/responder" component={ResponderPortalPage} />
      <RoleProtectedRoute path="/voice-incident" component={VoiceIncidentPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      
      {/* Communications - SMS Management */}
      <RoleProtectedRoute path="/sms" component={SmsPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/sms/compose" component={SmsPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/sms/templates" component={SmsPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/sms/logs" component={SmsPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      
      {/* Social Media */}
      <RoleProtectedRoute path="/social-media" component={SocialMediaPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/social-media/twitter" component={SocialMediaPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/social-media/facebook" component={SocialMediaPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/social-media/instagram" component={SocialMediaPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      <RoleProtectedRoute path="/social-media/tiktok" component={SocialMediaPage} allowedRoles={["admin", "coordinator", "analyst", "field_agent"]} />
      
      {/* Administration */}
      <RoleProtectedRoute path="/audit-logs" component={AuditLogsPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/enterprise-settings" component={EnterpriseSettingsPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/user-management" component={UserManagementPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/cms" component={CmsManagementPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/integrations" component={IntegrationsPage} />
      <ProtectedRoute path="/reporting" component={ReportingPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />

      {/* Election Monitoring */}
      <RoleProtectedRoute path="/election-monitoring" component={ElectionMonitoringDashboard} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/election-monitoring/news" component={ElectionNewsFeedPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/election-monitoring/elections" component={ElectionElectionsPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/election-monitoring/parties" component={ElectionPartiesPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/election-monitoring/politicians" component={ElectionPoliticiansPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/election-monitoring/actors" component={ElectionActorsPage} allowedRoles={["admin", "coordinator", "analyst"]} />
      <RoleProtectedRoute path="/election-monitoring/violence" component={ElectionViolencePage} allowedRoles={["admin", "coordinator", "analyst"]} />

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

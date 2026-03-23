/**
 * Platform feature permissions for Early Warning & Early Response.
 * Admin can grant/revoke these per user via checkboxes; '*' means full access.
 * Categories and labels match the sidebar exactly.
 */
export interface PlatformFeature {
  id: string;
  label: string;
  category: string;
  description?: string;
}

export const PLATFORM_FEATURES: PlatformFeature[] = [
  // Main Navigation
  { id: "dashboard", label: "Dashboard", category: "Main Navigation" },
  { id: "executive", label: "Executive Dashboard", category: "Main Navigation" },
  { id: "situation_room", label: "Situation Room", category: "Main Navigation" },
  { id: "conflict_management", label: "Conflict Management", category: "Main Navigation" },
  { id: "map", label: "Nigeria Conflict Map", category: "Main Navigation" },
  { id: "search", label: "Search", category: "Main Navigation" },
  // AI Assistant
  { id: "ai_analysis", label: "AI Analysis", category: "AI Assistant" },
  { id: "ai_prediction", label: "Predictive Models", category: "AI Assistant" },
  { id: "ai_advisor", label: "Response Advisor", category: "AI Assistant" },
  { id: "peace_indicators", label: "Peace Opportunity Indicators", category: "AI Assistant" },
  // Data Management
  { id: "data_collection", label: "Create Report", category: "Data Management" },
  { id: "data_processing", label: "Data Processing & Analysis", category: "Data Management" },
  { id: "collected_data", label: "Collected Data", category: "Data Management" },
  { id: "processed_data", label: "Processed Data", category: "Data Management" },
  // Election Monitoring
  { id: "election_monitoring", label: "Dashboard", category: "Election Monitoring" },
  { id: "election_news", label: "Election News", category: "Election Monitoring" },
  { id: "election_elections", label: "Elections", category: "Election Monitoring" },
  { id: "election_parties", label: "Political Parties", category: "Election Monitoring" },
  { id: "election_politicians", label: "Politicians", category: "Election Monitoring" },
  { id: "election_actors", label: "Actors & Non-Actors", category: "Election Monitoring" },
  { id: "election_violence", label: "Violence & Events", category: "Election Monitoring" },
  // Risk Assessment
  { id: "risk_assessment", label: "Risk Assessment", category: "Risk Assessment" },
  { id: "visualization", label: "Visualization", category: "Risk Assessment" },
  // Response Management
  { id: "alerts", label: "Alerts", category: "Response Management" },
  { id: "incident_review", label: "Incident Review", category: "Response Management" },
  { id: "voice_incident", label: "Voice Incident Report", category: "Response Management" },
  { id: "case_management", label: "Case Management", category: "Response Management" },
  { id: "response_plans", label: "Response Plans", category: "Response Management" },
  { id: "responder_portal", label: "Responder Portal", category: "Response Management" },
  // Communications
  { id: "chat", label: "Chat", category: "Communications" },
  { id: "email", label: "Internal Email", category: "Communications" },
  { id: "calls", label: "Voice & Video Calls", category: "Communications" },
  { id: "sms", label: "SMS Management", category: "Communications" },
  { id: "sms_compose", label: "Compose SMS", category: "Communications" },
  { id: "sms_templates", label: "SMS Templates", category: "Communications" },
  { id: "sms_logs", label: "Messaging Logs", category: "Communications" },
  { id: "social_media", label: "Social Media", category: "Communications" },
  // Social Media (own section)
  { id: "social_dashboard", label: "Social Dashboard", category: "Social Media" },
  { id: "social_twitter", label: "X (Twitter)", category: "Social Media" },
  { id: "social_facebook", label: "Facebook", category: "Social Media" },
  { id: "social_instagram", label: "Instagram", category: "Social Media" },
  { id: "social_tiktok", label: "TikTok", category: "Social Media" },
  // Administration
  { id: "audit_logs", label: "Audit Logs", category: "Administration" },
  { id: "enterprise_settings", label: "Enterprise Settings", category: "Administration" },
  { id: "user_management", label: "User Management", category: "Administration" },
  { id: "workflows", label: "Workflows", category: "Administration" },
  { id: "integrations", label: "Integrations", category: "Administration" },
  { id: "reporting", label: "Reporting", category: "Administration" },
  { id: "settings", label: "Settings", category: "Administration" },
];

/**
 * Default feature permissions per role. Used when creating users and when a user
 * has no permissions set (e.g. legacy "view" only). Admin gets full access; standard user
 * gets a limited set; other roles get role-appropriate defaults.
 */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  admin: ["*"],
  coordinator: [
    "dashboard", "executive", "situation_room", "conflict_management", "map", "search",
    "ai_analysis", "ai_prediction", "ai_advisor", "peace_indicators",
    "data_collection", "data_processing", "collected_data", "processed_data",
    "election_monitoring", "election_news", "election_elections", "election_parties", "election_politicians", "election_actors", "election_violence",
    "risk_assessment", "visualization",
    "alerts", "incident_review", "voice_incident", "case_management", "response_plans", "responder_portal",
    "chat", "email", "calls", "sms", "sms_compose", "sms_templates", "sms_logs", "social_media",
    "social_dashboard", "social_twitter", "social_facebook", "social_instagram", "social_tiktok",
    "reporting", "settings",
  ],
  analyst: [
    "dashboard", "executive", "map", "search",
    "ai_analysis", "ai_prediction", "ai_advisor", "peace_indicators",
    "data_collection", "data_processing", "collected_data", "processed_data",
    "election_monitoring", "election_news", "election_elections", "election_parties", "election_politicians", "election_actors", "election_violence",
    "risk_assessment", "visualization",
    "alerts", "case_management", "response_plans",
    "chat", "email", "calls", "sms", "social_media", "social_dashboard", "social_twitter", "social_facebook", "social_instagram", "social_tiktok",
    "reporting", "settings",
  ],
  field_agent: [
    "dashboard", "map", "search",
    "voice_incident", "case_management", "responder_portal",
    "chat", "email", "calls", "sms", "sms_compose", "sms_templates", "sms_logs",
    "social_media", "social_dashboard", "social_twitter", "social_facebook", "social_instagram", "social_tiktok",
    "settings",
  ],
  user: [
    "dashboard", "map", "search",
    "voice_incident",
    "chat", "email", "calls", "settings",
  ],
};

export function getDefaultPermissionsForRole(role: string): string[] {
  const normalized = (role || "user").toLowerCase();
  return DEFAULT_PERMISSIONS_BY_ROLE[normalized] ?? DEFAULT_PERMISSIONS_BY_ROLE.user;
}

/** Display labels for roles (for Role Permission editor). */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  coordinator: "Response Coordinator",
  analyst: "Data Analyst",
  field_agent: "Field Agent",
  user: "Standard User",
};
export const ROLE_IDS = ["admin", "coordinator", "analyst", "field_agent", "user"] as const;

/** Map route path to permission id (for sidebar/route gating). */
export const ROUTE_TO_PERMISSION: Record<string, string> = {
  "/dashboard": "dashboard",
  "/executive": "executive",
  "/internal": "situation_room",
  "/crises": "conflict_management",
  "/map": "map",
  "/search": "search",
  "/ai-analysis": "ai_analysis",
  "/ai-prediction": "ai_prediction",
  "/ai-advisor": "ai_advisor",
  "/peace-indicators": "peace_indicators",
  "/data-collection": "data_collection",
  "/data-processing": "data_processing",
  "/collected-data": "collected_data",
  "/processed-data": "processed_data",
  "/election-monitoring": "election_monitoring",
  "/election-monitoring/news": "election_news",
  "/election-monitoring/elections": "election_elections",
  "/election-monitoring/parties": "election_parties",
  "/election-monitoring/politicians": "election_politicians",
  "/election-monitoring/actors": "election_actors",
  "/election-monitoring/violence": "election_violence",
  "/analysis": "risk_assessment",
  "/visualization": "visualization",
  "/alerts": "alerts",
  "/incident-review": "incident_review",
  "/voice-incident": "voice_incident",
  "/case-management": "case_management",
  "/response-plans": "response_plans",
  "/responder": "responder_portal",
  "/chat": "chat",
  "/email": "email",
  "/calls": "calls",
  "/sms": "sms",
  "/sms/compose": "sms_compose",
  "/sms/templates": "sms_templates",
  "/sms/logs": "sms_logs",
  "/social-media": "social_dashboard",
  "/social-media/twitter": "social_twitter",
  "/social-media/facebook": "social_facebook",
  "/social-media/instagram": "social_instagram",
  "/social-media/tiktok": "social_tiktok",
  "/audit-logs": "audit_logs",
  "/enterprise-settings": "enterprise_settings",
  "/user-management": "user_management",
  "/workflows": "workflows",
  "/integrations": "integrations",
  "/reporting": "reporting",
  "/settings": "settings",
};

export function getFeaturesByCategory(): Record<string, PlatformFeature[]> {
  const order = [
    "Main Navigation",
    "AI Assistant",
    "Data Management",
    "Election Monitoring",
    "Risk Assessment",
    "Response Management",
    "Communications",
    "Social Media",
    "Administration",
  ];
  const byCategory: Record<string, PlatformFeature[]> = {};
  for (const f of PLATFORM_FEATURES) {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  }
  const ordered: Record<string, PlatformFeature[]> = {};
  for (const cat of order) {
    if (byCategory[cat]) ordered[cat] = byCategory[cat];
  }
  for (const cat of Object.keys(byCategory)) {
    if (!ordered[cat]) ordered[cat] = byCategory[cat];
  }
  return ordered;
}

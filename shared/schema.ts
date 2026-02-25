import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").notNull().primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // 'admin', 'analyst', 'responder', 'manager', 'user'
  securityLevel: integer("security_level").notNull().default(1), // Security clearance level from 1 to 7
  permissions: jsonb("permissions").$type<string[]>().default(['view']),
  department: text("department"),
  position: text("position"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  active: boolean("active").default(true),
  lastLogin: timestamp("last_login"),
  avatar: text("avatar"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  securityLevel: true,
  permissions: true,
  department: true,
  position: true,
  phoneNumber: true,
  email: true,
  active: true,
  avatar: true,
});

// 1. Data Collection Module - Data Sources
export const dataSources = pgTable("data_sources", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // social_media, news_media, satellite, government_report, ngo_report, sensor_network, field_report
  description: text("description"),
  status: text("status").notNull().default("active"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  lastFetchedAt: timestamp("last_fetched_at"),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  region: text("region").notNull().default("Nigeria"),
  frequency: text("frequency"), // hourly, daily, weekly, real-time
  dataFormat: text("data_format"), // json, xml, csv
  metaData: jsonb("meta_data"),
});

export const insertDataSourceSchema = createInsertSchema(dataSources).pick({
  name: true,
  type: true,
  description: true,
  status: true,
  apiEndpoint: true,
  apiKey: true,
  region: true,
  frequency: true,
  dataFormat: true,
  metaData: true,
});

// Collected Data
export const collectedData = pgTable("collected_data", {
  id: serial("id").notNull().primaryKey(),
  sourceId: integer("source_id").notNull(),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
  content: jsonb("content").notNull(),
  location: text("location"),
  coordinates: jsonb("coordinates"),
  region: text("region").notNull().default("Nigeria"),
  processed: boolean("processed").notNull().default(false),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default("unprocessed"), // unprocessed, processed, error
  sentiment: text("sentiment"),
  keywords: text("keywords").array(),
  mediaUrls: text("media_urls").array(),
});

export const insertCollectedDataSchema = createInsertSchema(collectedData).pick({
  sourceId: true,
  content: true,
  location: true,
  coordinates: true,
  region: true,
  sentiment: true,
  keywords: true,
  mediaUrls: true,
});

// 2. Data Processing Module - Processed Data
export const processedData = pgTable("processed_data", {
  id: serial("id").notNull().primaryKey(),
  rawDataId: integer("raw_data_id").notNull(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  result: jsonb("result").notNull(),
  processingMethod: text("processing_method").notNull(), // nlp, sentiment_analysis, geospatial, entity_extraction
  confidence: integer("confidence"), // 0-100 scale
  relevanceScore: integer("relevance_score"), // 0-100 scale
  entities: jsonb("entities"),
  topics: text("topics").array(),
  normalizedLocation: text("normalized_location"),
  region: text("region").notNull().default("Nigeria"),
});

export const insertProcessedDataSchema = createInsertSchema(processedData).pick({
  rawDataId: true,
  result: true,
  processingMethod: true,
  confidence: true,
  relevanceScore: true,
  entities: true,
  topics: true,
  normalizedLocation: true,
  region: true,
});

// 3. Risk Detection Module - Risk Indicators
export const riskIndicators = pgTable("risk_indicators", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // political, economic, environmental, social
  value: integer("value").notNull(), // 0-100 scale
  threshold: integer("threshold").notNull().default(70), // 0-100 scale
  location: text("location").notNull(),
  region: text("region").notNull().default("Nigeria"),
  state: text("state"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sourceId: integer("source_id"),
  dataPointIds: integer("data_point_ids").array(),
  trend: text("trend"), // increasing, decreasing, stable
  confidence: integer("confidence"), // 0-100 scale
  metaData: jsonb("meta_data"),
});

export const insertRiskIndicatorSchema = createInsertSchema(riskIndicators).pick({
  name: true,
  description: true,
  category: true,
  value: true,
  threshold: true,
  location: true,
  region: true,
  state: true,
  sourceId: true,
  dataPointIds: true,
  trend: true,
  confidence: true,
  metaData: true,
});

// Incidents (detected events)
export const incidents = pgTable("incidents", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  region: text("region").notNull().default("Nigeria"),
  state: text("state"),
  lga: text("lga"), // Local Government Area
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("active"),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  reportedBy: integer("reported_by").notNull(),
  sourceId: integer("source_id"),
  coordinates: jsonb("coordinates"),
  category: text("category").notNull(), // violence, protest, natural_disaster, economic, political
  relatedIndicators: integer("related_indicators").array(),
  impactedPopulation: integer("impacted_population"),
  mediaUrls: text("media_urls").array(),
  verificationStatus: text("verification_status").notNull().default("unverified"), // unverified, partially_verified, verified
  isPinned: boolean("is_pinned").default(false), // Pin important incidents on map
  audioRecordingUrl: text("audio_recording_url"), // URL to uploaded audio file
  audioTranscription: text("audio_transcription"), // Transcribed text from audio
  reportingMethod: text("reporting_method").default("text"), // text, voice, sms, web_form
  transcriptionConfidence: integer("transcription_confidence"), // 0-100 scale
});

export const insertIncidentSchema = createInsertSchema(incidents).pick({
  title: true,
  description: true,
  location: true,
  region: true,
  state: true,
  lga: true,
  severity: true,
  status: true,
  reportedBy: true,
  sourceId: true,
  coordinates: true,
  category: true,
  relatedIndicators: true,
  impactedPopulation: true,
  mediaUrls: true,
  verificationStatus: true,
  isPinned: true,
  audioRecordingUrl: true,
  audioTranscription: true,
  reportingMethod: true,
  transcriptionConfidence: true,
});

// Case Management - Cases
export const cases = pgTable("cases", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  incidentId: integer("incident_id"),
  createdBy: integer("created_by").notNull(),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(cases).pick({
  title: true,
  description: true,
  status: true,
  priority: true,
  incidentId: true,
  createdBy: true,
  assignedTo: true,
});

// Case Management - Notes
export const caseNotes = pgTable("case_notes", {
  id: serial("id").notNull().primaryKey(),
  caseId: integer("case_id").notNull(),
  authorId: integer("author_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCaseNoteSchema = createInsertSchema(caseNotes).pick({
  caseId: true,
  authorId: true,
  note: true,
});

// 4. Risk Assessment - Analyses
export const riskAnalyses = pgTable("risk_analyses", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  analysis: text("analysis").notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  likelihood: text("likelihood").notNull(), // unlikely, possible, likely, very_likely
  impact: text("impact").notNull(), // minimal, moderate, significant, severe
  region: text("region").notNull().default("Nigeria"),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
  relatedIncidents: integer("related_incidents").array(),
  relatedIndicators: integer("related_indicators").array(),
  stakeholders: jsonb("stakeholders"),
  recommendations: text("recommendations").notNull(),
  timeframe: text("timeframe"), // immediate, short_term, medium_term, long_term
});

export const insertRiskAnalysisSchema = createInsertSchema(riskAnalyses).pick({
  title: true,
  description: true,
  analysis: true,
  severity: true,
  likelihood: true,
  impact: true,
  region: true,
  location: true,
  createdBy: true,
  relatedIncidents: true,
  relatedIndicators: true,
  stakeholders: true,
  recommendations: true,
});

// 5. Alert Generation Module - Alerts
export const alerts = pgTable("alerts", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("active"), // active, resolved, false_positive
  source: text("source").notNull().default("system"), // automated, manual, external
  category: text("category"), // security, health, environment, infrastructure, etc.
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  region: text("region").notNull().default("Nigeria"),
  location: text("location").notNull(),
  incidentId: integer("incident_id"),
  channels: text("channels").array(),
  recipients: jsonb("recipients"),
});

export const insertAlertSchema = createInsertSchema(alerts).pick({
  title: true,
  description: true,
  severity: true,
  status: true,
  source: true,
  category: true,
  region: true,
  location: true,
  incidentId: true,
  channels: true,
  recipients: true,
});

// Response Activities
export const responseActivities = pgTable("response_activities", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  alertId: integer("alert_id"),
  incidentId: integer("incident_id"),
});

export const insertResponseActivitySchema = createInsertSchema(responseActivities).pick({
  title: true,
  description: true,
  status: true,
  assignedTo: true,
  startedAt: true,
  completedAt: true,
  alertId: true,
  incidentId: true,
});

// Response Teams
export const responseTeams = pgTable("response_teams", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // medical, security, logistics, assessment, mediation
  status: text("status").notNull().default("active"),
  members: jsonb("members"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  region: text("region").notNull().default("Nigeria"),
  location: text("location").notNull(),
  capacity: integer("capacity"),
  leader: integer("leader"),
  expertiseAreas: text("expertise_areas").array(),
});

export const insertResponseTeamSchema = createInsertSchema(responseTeams).pick({
  name: true,
  type: true,
  status: true,
  members: true,
  region: true,
  location: true,
  capacity: true,
  leader: true,
  expertiseAreas: true,
});

// Response Plans
export const responsePlans = pgTable("response_plans", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("draft"), // draft, active, completed
  category: text("category").notNull().default("preventive"), // emergency, preventive, recovery
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
  region: text("region").notNull().default("Nigeria"),
  location: text("location").notNull(),
  steps: jsonb("steps"),
  resources: jsonb("resources"),
  assignedTeams: integer("assigned_teams").array(),
  alertId: integer("alert_id"),
  incidentId: integer("incident_id"),
  riskAnalysisId: integer("risk_analysis_id"),
  interAgencyPortal: jsonb("inter_agency_portal"),
});

export const insertResponsePlanSchema = createInsertSchema(responsePlans).pick({
  title: true,
  description: true,
  status: true,
  category: true,
  createdBy: true,
  region: true,
  location: true,
  steps: true,
  resources: true,
  assignedTeams: true,
  alertId: true,
  incidentId: true,
  riskAnalysisId: true,
  interAgencyPortal: true,
});

// 7. Monitoring Module - Feedback
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").notNull().primaryKey(),
  type: text("type").notNull(), // response_feedback, system_feedback, alert_feedback
  content: text("content").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  submittedBy: integer("submitted_by").notNull(),
  relatedIncidentId: integer("related_incident_id"),
  responseId: integer("response_id"),
  alertId: integer("alert_id"),
  incidentId: integer("incident_id"),
  status: text("status").notNull().default("pending"), // pending, reviewed, implemented
  reviewedBy: integer("reviewed_by").notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).pick({
  type: true,
  content: true,
  submittedBy: true,
  relatedIncidentId: true,
  responseId: true,
  alertId: true,
  incidentId: true,
  status: true,
  reviewedBy: true,
});

// 8. Reporting Module - Reports
export const reports = pgTable("reports", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // incident_report, situation_report, analysis_report, feedback_report
  content: jsonb("content").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  region: text("region").notNull().default("Nigeria"),
  // ... (rest of the code remains the same)
  location: text("location"),
  relatedIncidents: integer("related_incidents").array(),
  relatedResponses: integer("related_responses").array(),
  status: text("status").notNull().default("draft"), // draft, published, archived
  publishedAt: timestamp("published_at"),
  recipients: jsonb("recipients"),
  attachments: jsonb("attachments"),
  tags: text("tags").array(),
});

export const insertReportSchema = createInsertSchema(reports).pick({
  title: true,
  type: true,
  content: true,
  createdBy: true,
  startDate: true,
  endDate: true,
  region: true,
  location: true,
  relatedIncidents: true,
  relatedResponses: true,
  status: true,
  publishedAt: true,
  recipients: true,
  attachments: true,
  tags: true,
});

// 9. Settings and Configuration
export const settings = pgTable("settings", {
  id: serial("id").notNull().primaryKey(),
  category: text("category").notNull(), // alert_thresholds, system_config, notification_rules
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  category: true,
  key: true,
  value: true,
  description: true,
  updatedBy: true,
});

// Notifications - User notifications (alerts, crisis updates)
export const notifications = pgTable("notifications", {
  id: serial("id").notNull().primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  incidentId: integer("incident_id").references(() => incidents.id),
  alertId: integer("alert_id").references(() => alerts.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, warning, critical, crisis
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  sid: text("sid").notNull().primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  incidentId: true,
  alertId: true,
  title: true,
  message: true,
  type: true,
});

// 10. Security Module - Access Logs
export const accessLogs = pgTable("access_logs", {
  id: serial("id").notNull().primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // login, logout, view, create, update, delete
  resource: text("resource").notNull(), // user, incident, alert, etc.
  resourceId: integer("resource_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  successful: boolean("successful").notNull().default(true),
  details: jsonb("details"),
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).pick({
  userId: true,
  action: true,
  resource: true,
  resourceId: true,
  ipAddress: true,
  userAgent: true,
  successful: true,
  details: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;

export type InsertCollectedData = z.infer<typeof insertCollectedDataSchema>;
export type CollectedData = typeof collectedData.$inferSelect;

export type InsertProcessedData = z.infer<typeof insertProcessedDataSchema>;
export type ProcessedData = typeof processedData.$inferSelect;

export type InsertRiskIndicator = z.infer<typeof insertRiskIndicatorSchema>;
export type RiskIndicator = typeof riskIndicators.$inferSelect;

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;

export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;
export type CaseNote = typeof caseNotes.$inferSelect;

export type InsertRiskAnalysis = z.infer<typeof insertRiskAnalysisSchema>;
export type RiskAnalysis = typeof riskAnalyses.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertResponsePlan = z.infer<typeof insertResponsePlanSchema>;
export type ResponsePlan = typeof responsePlans.$inferSelect;

export type InsertResponseActivity = z.infer<typeof insertResponseActivitySchema>;
export type ResponseActivity = typeof responseActivities.$inferSelect;

export type InsertResponseTeam = z.infer<typeof insertResponseTeamSchema>;
export type ResponseTeam = typeof responseTeams.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbacks.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;

// 11. API Integration Module - API Keys
export const apiKeys = pgTable("api_keys", {
  id: serial("id").notNull().primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used"),
  status: text("status").notNull().default("active"),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  name: true,
  key: true,
  permissions: true,
  expiresAt: true,
  status: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// 12. Webhook Module - Webhooks
export const webhooks = pgTable("webhooks", {
  id: serial("id").notNull().primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastTriggered: timestamp("last_triggered"),
  status: text("status").notNull().default("active"),
});

export const insertWebhookSchema = createInsertSchema(webhooks).pick({
  userId: true,
  name: true,
  url: true,
  secret: true,
  events: true,
  status: true,
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Password reset tokens (for forgot password flow)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").notNull().primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Enterprise: Alert Templates - Reusable templates for crisis types
export const alertTemplates = pgTable("alert_templates", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("medium"),
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  channels: text("channels").array(),
  escalationLevel: integer("escalation_level").default(3),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
});

export const insertAlertTemplateSchema = createInsertSchema(alertTemplates).pick({
  name: true,
  category: true,
  severity: true,
  titleTemplate: true,
  bodyTemplate: true,
  channels: true,
  escalationLevel: true,
  createdBy: true,
});

export type InsertAlertTemplate = z.infer<typeof insertAlertTemplateSchema>;
export type AlertTemplate = typeof alertTemplates.$inferSelect;

// Enterprise: Risk Zones - Geographic areas with risk levels
export const riskZones = pgTable("risk_zones", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull().default("Nigeria"),
  state: text("state"),
  coordinates: jsonb("coordinates"),
  riskLevel: text("risk_level").notNull(), // low, medium, high, critical
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRiskZoneSchema = createInsertSchema(riskZones).pick({
  name: true,
  region: true,
  state: true,
  coordinates: true,
  riskLevel: true,
  description: true,
});

export type InsertRiskZone = z.infer<typeof insertRiskZoneSchema>;
export type RiskZone = typeof riskZones.$inferSelect;

// Enterprise: Escalation Rules - SLA and escalation configuration
export const escalationRules = pgTable("escalation_rules", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  triggerSeverity: text("trigger_severity").notNull(),
  slaMinutes: integer("sla_minutes").notNull(),
  escalateToLevel: integer("escalate_to_level").notNull(),
  notifyRoles: text("notify_roles").array(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEscalationRuleSchema = createInsertSchema(escalationRules).pick({
  name: true,
  triggerSeverity: true,
  slaMinutes: true,
  escalateToLevel: true,
  notifyRoles: true,
  active: true,
});

export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;
export type EscalationRule = typeof escalationRules.$inferSelect;

// Enterprise: Threshold Alert Rules - Trigger alerts when indicators or incident counts exceed thresholds
export const thresholdAlertRules = pgTable("threshold_alert_rules", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // 'indicator' | 'incident_count'
  triggerConfig: jsonb("trigger_config").notNull(), // { indicatorId?, region?, minValue? } or { region?, count?, withinDays? }
  severity: text("severity").notNull().default("high"), // low, medium, high, critical
  messageTemplate: text("message_template").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertThresholdAlertRuleSchema = createInsertSchema(thresholdAlertRules).pick({
  name: true,
  triggerType: true,
  triggerConfig: true,
  severity: true,
  messageTemplate: true,
  active: true,
});

export type InsertThresholdAlertRule = z.infer<typeof insertThresholdAlertRuleSchema>;
export type ThresholdAlertRule = typeof thresholdAlertRules.$inferSelect;

// AI: Peace Opportunity predictions - persist peace opportunity windows generated by the AI service
export const peaceOpportunities = pgTable("peace_opportunities", {
  id: serial("id").notNull().primaryKey(),
  externalId: text("external_id"), // e.g. peaceIndicatorsService-generated id
  title: text("title").notNull(),
  description: text("description"),
  region: text("region").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  priority: text("priority").notNull(), // low, medium, high, critical
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  windowOptimal: timestamp("window_optimal").notNull(),
  indicators: jsonb("indicators"),
  prerequisites: jsonb("prerequisites"),
  recommendations: jsonb("recommendations"),
  riskFactors: jsonb("risk_factors"),
  successProbability: integer("success_probability").notNull(), // 0-100
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const insertPeaceOpportunitySchema = createInsertSchema(peaceOpportunities).pick({
  externalId: true,
  title: true,
  description: true,
  region: true,
  confidence: true,
  priority: true,
  windowStart: true,
  windowEnd: true,
  windowOptimal: true,
  indicators: true,
  prerequisites: true,
  recommendations: true,
  riskFactors: true,
  successProbability: true,
});

export type InsertPeaceOpportunity = z.infer<typeof insertPeaceOpportunitySchema>;
export type PeaceOpportunityRow = typeof peaceOpportunities.$inferSelect;

// AI: Escalation Prediction - per-incident escalation risk predictions
export const escalationPredictions = pgTable("escalation_predictions", {
  id: serial("id").notNull().primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id),
  region: text("region"),
  currentSeverity: text("current_severity"),
  escalationRisk: text("escalation_risk"), // low, medium, high
  probability: integer("probability"), // 0-100
  timeWindowDays: integer("time_window_days"),
  keyDrivers: jsonb("key_drivers"),
  recommendedActions: jsonb("recommended_actions"),
  modelSource: text("model_source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEscalationPredictionSchema = createInsertSchema(escalationPredictions).pick({
  incidentId: true,
  region: true,
  currentSeverity: true,
  escalationRisk: true,
  probability: true,
  timeWindowDays: true,
  keyDrivers: true,
  recommendedActions: true,
  modelSource: true,
});

export type InsertEscalationPrediction = z.infer<typeof insertEscalationPredictionSchema>;
export type EscalationPrediction = typeof escalationPredictions.$inferSelect;

// Data Processing: Incident anomalies detected by analytics (e.g. unusual spikes)
export const incidentAnomalies = pgTable("incident_anomalies", {
  id: serial("id").notNull().primaryKey(),
  date: date("date").notNull(),
  region: text("region"),
  metric: text("metric").notNull(), // e.g. daily_incident_count
  observed: integer("observed").notNull(),
  expected: integer("expected").notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIncidentAnomalySchema = createInsertSchema(incidentAnomalies).pick({
  date: true,
  region: true,
  metric: true,
  observed: true,
  expected: true,
  severity: true,
  description: true,
});

export type InsertIncidentAnomaly = z.infer<typeof insertIncidentAnomalySchema>;
export type IncidentAnomaly = typeof incidentAnomalies.$inferSelect;

// Data Quality: Detected data quality issues across entities
export const dataQualityIssues = pgTable("data_quality_issues", {
  id: serial("id").notNull().primaryKey(),
  entityType: text("entity_type").notNull(), // incident, risk_indicator, collected_data, etc.
  entityId: integer("entity_id"),
  issueType: text("issue_type").notNull(), // missing_field, duplicate, invalid_value, suspicious_date, etc.
  field: text("field"),
  severity: text("severity").notNull(), // low, medium, high, critical
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open, resolved
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertDataQualityIssueSchema = createInsertSchema(dataQualityIssues).pick({
  entityType: true,
  entityId: true,
  issueType: true,
  field: true,
  severity: true,
  message: true,
  status: true,
  metadata: true,
});

export type InsertDataQualityIssue = z.infer<typeof insertDataQualityIssueSchema>;
export type DataQualityIssue = typeof dataQualityIssues.$inferSelect;

// SMS Logs - Track sent messages
export const smsLogs = pgTable("sms_logs", {
  id: serial("id").notNull().primaryKey(),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, delivered, failed
  externalId: text("external_id"), // Twilio SID
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  sentBy: integer("sent_by").references(() => users.id),
});

export const insertSmsLogSchema = createInsertSchema(smsLogs).pick({
  recipient: true,
  message: true,
  status: true,
  externalId: true,
  sentBy: true,
});

export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;
export type SmsLog = typeof smsLogs.$inferSelect;

// SMS Templates - Reusable message templates
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).pick({
  name: true,
  content: true,
});

export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;

// Incoming SMS - Messages received from field agents (via Twilio webhook)
export const incomingSms = pgTable("incoming_sms", {
  id: serial("id").notNull().primaryKey(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  twilioSid: text("twilio_sid"),
  location: text("location"),
  status: text("status").notNull().default("new"), // new, read, processed
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertIncomingSmsSchema = createInsertSchema(incomingSms).pick({
  sender: true,
  content: true,
  twilioSid: true,
  location: true,
  status: true,
});

export type InsertIncomingSms = z.infer<typeof insertIncomingSmsSchema>;
export type IncomingSms = typeof incomingSms.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").notNull().primaryKey(),
  type: text("type").notNull().default("chat"),
  title: text("title"),
  incidentId: integer("incident_id"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  type: true,
  title: true,
  incidentId: true,
  createdBy: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").notNull().primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).pick({
  conversationId: true,
  userId: true,
  role: true,
  lastReadAt: true,
});

export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").notNull().primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  body: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const messageAttachments = pgTable("message_attachments", {
  id: serial("id").notNull().primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).pick({
  messageId: true,
  uploadedBy: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  sizeBytes: true,
  url: true,
});

export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;

export const callSessions = pgTable("call_sessions", {
  id: serial("id").notNull().primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  incidentId: integer("incident_id"),
  type: text("type").notNull().default("video"),
  status: text("status").notNull().default("active"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const insertCallSessionSchema = createInsertSchema(callSessions).pick({
  conversationId: true,
  incidentId: true,
  type: true,
  status: true,
  createdBy: true,
  endedAt: true,
});

export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallSession = typeof callSessions.$inferSelect;

export const callParticipants = pgTable("call_participants", {
  id: serial("id").notNull().primaryKey(),
  callSessionId: integer("call_session_id").references(() => callSessions.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  guestDisplayName: text("guest_display_name"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
});

export const insertCallParticipantSchema = createInsertSchema(callParticipants).pick({
  callSessionId: true,
  userId: true,
  guestDisplayName: true,
  leftAt: true,
});

export type InsertCallParticipant = z.infer<typeof insertCallParticipantSchema>;
export type CallParticipant = typeof callParticipants.$inferSelect;

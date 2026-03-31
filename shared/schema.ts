import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { DEPARTMENT_IDS } from "./department-access";

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
  responderAgency: text("responder_agency"), // police, army, dss, immigration, customs, nia, navy, air_force, other
  active: boolean("active").default(true),
  lastLogin: timestamp("last_login"),
  avatar: text("avatar"),
});

const departmentEnumZ = z.enum(DEPARTMENT_IDS as unknown as [string, ...string[]]);

export const insertUserSchema = createInsertSchema(users)
  .pick({
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
    responderAgency: true,
    active: true,
    avatar: true,
  })
  .extend({
    department: departmentEnumZ,
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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

export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;

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
  status: text("status").notNull().default("pending"), // unprocessed, processed, error
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

export type InsertCollectedData = z.infer<typeof insertCollectedDataSchema>;
export type CollectedData = typeof collectedData.$inferSelect;

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

export type InsertProcessedData = z.infer<typeof insertProcessedDataSchema>;
export type ProcessedData = typeof processedData.$inferSelect;

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

export type InsertRiskIndicator = z.infer<typeof insertRiskIndicatorSchema>;
export type RiskIndicator = typeof riskIndicators.$inferSelect;

// Incidents (detected events)
export const incidents = pgTable("incidents", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  region: text("region").notNull().default("Nigeria"),
  state: text("state"),
  lga: text("lga"), // Local Government Area
  town: text("town"),
  /** When the incident occurred in the field (optional; distinct from reported_at). */
  incidentOccurredAt: timestamp("incident_occurred_at"),
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
  // Responder workflow: processing pipeline and routing
  processingStatus: text("processing_status").default("draft"), // draft, under_analysis, analysis_complete, supervisor_review, coordinator_review, dispatched
  proposedResponderType: text("proposed_responder_type"), // kinetic, non_kinetic, mixed
  finalResponderType: text("final_responder_type"), // kinetic, non_kinetic, mixed
  assignedResponderTeamId: integer("assigned_responder_team_id"),
  supervisorId: integer("supervisor_id").references(() => users.id),
  coordinatorId: integer("coordinator_id").references(() => users.id),
  routedAt: timestamp("routed_at"),
});

export const insertIncidentSchema = createInsertSchema(incidents).pick({
  title: true,
  description: true,
  location: true,
  region: true,
  state: true,
  lga: true,
  town: true,
  incidentOccurredAt: true,
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

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export const alerts = pgTable("alerts", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("active"),
  source: text("source").notNull().default("system"),
  category: text("category"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  escalationLevel: integer("escalation_level").default(1),
  region: text("region").notNull().default("Nigeria"),
  location: text("location").notNull().default("Unknown"),
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
  acknowledgedAt: true,
  escalationLevel: true,
  region: true,
  location: true,
  incidentId: true,
  channels: true,
  recipients: true,
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export const responseTeams = pgTable("response_teams", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  members: jsonb("members"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  region: text("region").notNull().default("Nigeria"),
  location: text("location").notNull(),
  capacity: integer("capacity"),
  leader: integer("leader"),
  expertiseAreas: text("expertise_areas").array(),
  responseCategory: text("response_category"),
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
  responseCategory: true,
});

export type InsertResponseTeam = z.infer<typeof insertResponseTeamSchema>;
export type ResponseTeam = typeof responseTeams.$inferSelect;

export const responseActivities = pgTable("response_activities", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  alertId: integer("alert_id"),
  incidentId: integer("incident_id"),
  assignedTeamId: integer("assigned_team_id").references(() => responseTeams.id),
  responseType: text("response_type"),
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
  assignedTeamId: true,
  responseType: true,
});

export type InsertResponseActivity = z.infer<typeof insertResponseActivitySchema>;
export type ResponseActivity = typeof responseActivities.$inferSelect;

// Incident discussion thread (analyst, supervisor, coordinator, responder comments)
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

export const predictiveOutputs = pgTable("predictive_outputs", {
  id: serial("id").notNull().primaryKey(),
  kind: text("kind").notNull(),
  region: text("region").notNull().default("Nigeria"),
  modelSource: text("model_source").notNull().default("heuristic-v1"),
  params: jsonb("params").notNull(),
  result: jsonb("result").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const insertPredictiveOutputSchema = createInsertSchema(predictiveOutputs).pick({
  kind: true,
  region: true,
  modelSource: true,
  params: true,
  result: true,
});

export type InsertEscalationPrediction = z.infer<typeof insertEscalationPredictionSchema>;
export type EscalationPrediction = typeof escalationPredictions.$inferSelect;

export type InsertPredictiveOutput = z.infer<typeof insertPredictiveOutputSchema>;
export type PredictiveOutput = typeof predictiveOutputs.$inferSelect;

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
  // Optional fields to support end-to-end encryption without breaking existing chats
  ciphertext: text("ciphertext"),
  nonce: text("nonce"),
  algorithm: text("algorithm"),
  senderDeviceId: text("sender_device_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  body: true,
  ciphertext: true,
  nonce: true,
  algorithm: true,
  senderDeviceId: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Per-conversation keys (encrypted per user/device) for future E2EE rollout
export const conversationKeys = pgTable("conversation_keys", {
  id: serial("id").notNull().primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  algorithm: text("algorithm").notNull().default("xchacha20-poly1305"),
  deviceId: text("device_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationKeySchema = createInsertSchema(conversationKeys).pick({
  conversationId: true,
  userId: true,
  encryptedKey: true,
  algorithm: true,
  deviceId: true,
});

export type InsertConversationKey = z.infer<typeof insertConversationKeySchema>;
export type ConversationKey = typeof conversationKeys.$inferSelect;

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

// CMS Content for Landing Page
export const cmsContent = pgTable("cms_content", {
  id: serial("id").notNull().primaryKey(),
  section: text("section").notNull().unique(), // 'about_ipcr', 'about_director', 'peace_initiatives'
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertCmsContentSchema = createInsertSchema(cmsContent).pick({
  section: true,
  title: true,
  content: true,
  imageUrl: true,
  lastUpdatedBy: true,
  isActive: true,
});

export type InsertCmsContent = z.infer<typeof insertCmsContentSchema>;
export type CmsContent = typeof cmsContent.$inferSelect;

export const incidentDiscussions = pgTable("incident_discussions", {
  id: serial("id").notNull().primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  role: text("role").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIncidentDiscussionSchema = createInsertSchema(incidentDiscussions).pick({
  incidentId: true,
  authorId: true,
  role: true,
  comment: true,
});

export type InsertIncidentDiscussion = z.infer<typeof insertIncidentDiscussionSchema>;
export type IncidentDiscussion = typeof incidentDiscussions.$inferSelect;

export const incidentDispatches = pgTable("incident_dispatches", {
  id: serial("id").notNull().primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id).notNull(),
  agency: text("agency").notNull(),
  status: text("status").notNull().default("sent"),
  comment: text("comment"),
  dispatchedBy: integer("dispatched_by").references(() => users.id),
  dispatchedAt: timestamp("dispatched_at").notNull().defaultNow(),
});

export const insertIncidentDispatchSchema = createInsertSchema(incidentDispatches).pick({
  incidentId: true,
  agency: true,
  status: true,
  comment: true,
  dispatchedBy: true,
});

export type InsertIncidentDispatch = z.infer<typeof insertIncidentDispatchSchema>;
export type IncidentDispatch = typeof incidentDispatches.$inferSelect;

export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  activityType: text("activity_type"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).pick({
  name: true,
  entityType: true,
  activityType: true,
  isActive: true,
  createdBy: true,
});

export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;

export const workflowStages = pgTable("workflow_stages", {
  id: serial("id").notNull().primaryKey(),
  templateId: integer("template_id").references(() => workflowTemplates.id).notNull(),
  name: text("name").notNull(),
  stageOrder: integer("stage_order").notNull(),
  allowedRoles: text("allowed_roles").array(),
});

export const insertWorkflowStageSchema = createInsertSchema(workflowStages).pick({
  templateId: true,
  name: true,
  stageOrder: true,
  allowedRoles: true,
});

export type InsertWorkflowStage = z.infer<typeof insertWorkflowStageSchema>;
export type WorkflowStage = typeof workflowStages.$inferSelect;

export const workflowTransitions = pgTable("workflow_transitions", {
  id: serial("id").notNull().primaryKey(),
  templateId: integer("template_id").references(() => workflowTemplates.id).notNull(),
  fromStageId: integer("from_stage_id").references(() => workflowStages.id).notNull(),
  toStageId: integer("to_stage_id").references(() => workflowStages.id).notNull(),
  allowedRoles: text("allowed_roles").array(),
});

export const insertWorkflowTransitionSchema = createInsertSchema(workflowTransitions).pick({
  templateId: true,
  fromStageId: true,
  toStageId: true,
  allowedRoles: true,
});

export type InsertWorkflowTransition = z.infer<typeof insertWorkflowTransitionSchema>;
export type WorkflowTransition = typeof workflowTransitions.$inferSelect;

export const workflowInstances = pgTable("workflow_instances", {
  id: serial("id").notNull().primaryKey(),
  templateId: integer("template_id").references(() => workflowTemplates.id).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  currentStageId: integer("current_stage_id").references(() => workflowStages.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).pick({
  templateId: true,
  entityType: true,
  entityId: true,
  currentStageId: true,
});

export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;

export const workflowHistory = pgTable("workflow_history", {
  id: serial("id").notNull().primaryKey(),
  instanceId: integer("instance_id").references(() => workflowInstances.id).notNull(),
  fromStageId: integer("from_stage_id").references(() => workflowStages.id),
  toStageId: integer("to_stage_id").references(() => workflowStages.id),
  movedBy: integer("moved_by").references(() => users.id),
  comment: text("comment"),
  movedAt: timestamp("moved_at").notNull().defaultNow(),
});

export type WorkflowHistory = typeof workflowHistory.$inferSelect;

export {
  responsePlans,
  insertResponsePlanSchema,
  riskAnalyses,
  insertRiskAnalysisSchema,
  accessLogs,
  insertAccessLogSchema,
  cases,
  insertCaseSchema,
  caseNotes,
  insertCaseNoteSchema,
  settings,
  insertSettingSchema,
  reports,
  insertReportSchema,
  notifications,
  insertNotificationSchema,
  passwordResetTokens,
  insertPasswordResetTokenSchema,
  apiKeys,
  insertApiKeySchema,
  webhooks,
  insertWebhookSchema,
  feedbacks,
  insertFeedbackSchema,
  riskZones,
  insertRiskZoneSchema,
  escalationRules,
  insertEscalationRuleSchema,
  alertTemplates,
  insertAlertTemplateSchema,
  thresholdAlertRules,
  insertThresholdAlertRuleSchema,
  peaceOpportunities,
  insertPeaceOpportunitySchema,
  incidentAnomalies,
  insertIncidentAnomalySchema,
  dataQualityIssues,
  insertDataQualityIssueSchema,
  elections,
  insertElectionSchema,
  politicalParties,
  insertPoliticalPartySchema,
  politicians,
  insertPoliticianSchema,
  electionActors,
  insertElectionActorSchema,
  electionEvents,
  insertElectionEventSchema,
} from "./schema-SamSPC";

export type {
  ResponsePlan,
  InsertResponsePlan,
  RiskAnalysis,
  InsertRiskAnalysis,
  AccessLog,
  InsertAccessLog,
  Case,
  InsertCase,
  CaseNote,
  InsertCaseNote,
  Setting,
  InsertSetting,
  Report,
  InsertReport,
  Notification,
  InsertNotification,
  PasswordResetToken,
  InsertPasswordResetToken,
  ApiKey,
  InsertApiKey,
  Webhook,
  InsertWebhook,
  Feedback,
  InsertFeedback,
  RiskZone,
  InsertRiskZone,
  EscalationRule,
  InsertEscalationRule,
  AlertTemplate,
  InsertAlertTemplate,
  ThresholdAlertRule,
  InsertThresholdAlertRule,
  InsertPeaceOpportunity,
  PeaceOpportunityRow,
  IncidentAnomaly,
  InsertIncidentAnomaly,
  DataQualityIssue,
  InsertDataQualityIssue,
  Election,
  InsertElection,
  PoliticalParty,
  InsertPoliticalParty,
  Politician,
  InsertPolitician,
  ElectionActor,
  InsertElectionActor,
  ElectionEvent,
  InsertElectionEvent,
} from "./schema-SamSPC";

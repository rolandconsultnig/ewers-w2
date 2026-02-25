import { users, dataSources, collectedData, processedData, incidents, alerts, responseActivities, responseTeams, riskIndicators, riskAnalyses, responsePlans, feedbacks, reports, settings, accessLogs, apiKeys, webhooks, cases, caseNotes, conversations, conversationParticipants, messages, messageAttachments, callSessions, callParticipants } from "@shared/schema";
import type { 
  User, InsertUser, 
  DataSource, InsertDataSource, 
  CollectedData, InsertCollectedData,
  ProcessedData, InsertProcessedData,
  Incident, InsertIncident, 
  Case, InsertCase,
  CaseNote, InsertCaseNote,
  Alert, InsertAlert, 
  ResponseActivity, InsertResponseActivity, 
  ResponseTeam, InsertResponseTeam, 
  RiskIndicator, InsertRiskIndicator,
  RiskAnalysis, InsertRiskAnalysis,
  ResponsePlan, InsertResponsePlan,
  Feedback, InsertFeedback,
  Report, InsertReport,
  Setting, InsertSetting,
  AccessLog, InsertAccessLog,
  ApiKey, InsertApiKey,
  Webhook, InsertWebhook,
  Conversation, InsertConversation,
  ConversationParticipant, InsertConversationParticipant,
  Message, InsertMessage,
  MessageAttachment, InsertMessageAttachment,
  CallSession, InsertCallSession,
  CallParticipant, InsertCallParticipant
} from "@shared/schema";
import session from "express-session";
import { db, pool } from "./db";
import { eq, and, desc, gte, lte, gt, isNull } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  
  // Data source methods
  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(source: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, source: Partial<DataSource>): Promise<DataSource>;
  
  // Incident methods
  getIncidents(): Promise<Incident[]>;
  getIncidentsFiltered(filters: { state?: string; lga?: string; reportingMethod?: string }): Promise<Incident[]>;
  getIncident(id: number): Promise<Incident | undefined>;
  getIncidentsByTitle(title: string): Promise<Incident[]>;
  getIncidentsByRegion(region: string): Promise<Incident[]>;
  getIncidentsByLocation(lat: number, lng: number, radiusKm?: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: number, incident: Partial<Incident>): Promise<Incident>;
  deleteIncident(id: number): Promise<boolean>;

  // Case management methods
  getCases(): Promise<Case[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(newCase: InsertCase): Promise<Case>;
  updateCase(id: number, data: Partial<Case>): Promise<Case>;
  deleteCase(id: number): Promise<boolean>;
  getCaseNotes(caseId: number): Promise<CaseNote[]>;
  createCaseNote(note: InsertCaseNote): Promise<CaseNote>;
  
  // Alert methods
  getAlerts(): Promise<Alert[]>;
  getActiveAlerts(): Promise<Alert[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, alert: Partial<Alert>): Promise<Alert>;
  
  // Response activity methods
  getResponseActivities(): Promise<ResponseActivity[]>;
  getResponseActivity(id: number): Promise<ResponseActivity | undefined>;
  createResponseActivity(activity: InsertResponseActivity): Promise<ResponseActivity>;
  updateResponseActivity(id: number, activity: Partial<ResponseActivity>): Promise<ResponseActivity>;
  
  // Response team methods
  getResponseTeams(): Promise<ResponseTeam[]>;
  getResponseTeam(id: number): Promise<ResponseTeam | undefined>;
  createResponseTeam(team: InsertResponseTeam): Promise<ResponseTeam>;
  updateResponseTeam(id: number, team: Partial<ResponseTeam>): Promise<ResponseTeam>;
  
  // Risk indicator methods
  getRiskIndicators(): Promise<RiskIndicator[]>;
  getRiskIndicator(id: number): Promise<RiskIndicator | undefined>;
  createRiskIndicator(indicator: InsertRiskIndicator): Promise<RiskIndicator>;
  updateRiskIndicator(id: number, indicator: Partial<RiskIndicator>): Promise<RiskIndicator>;
  getRiskIndicatorsByTimeRange(startDate: Date, endDate: Date): Promise<RiskIndicator[]>;
  
  // Risk analysis methods
  getRiskAnalyses(): Promise<RiskAnalysis[]>;
  getRiskAnalysis(id: number): Promise<RiskAnalysis | undefined>;
  createRiskAnalysis(analysis: InsertRiskAnalysis): Promise<RiskAnalysis>;
  updateRiskAnalysis(id: number, analysis: Partial<RiskAnalysis>): Promise<RiskAnalysis>;
  
  // Response plan methods
  getResponsePlans(): Promise<ResponsePlan[]>;
  getResponsePlan(id: number): Promise<ResponsePlan | undefined>;
  createResponsePlan(plan: InsertResponsePlan): Promise<ResponsePlan>;
  updateResponsePlan(id: number, plan: Partial<ResponsePlan>): Promise<ResponsePlan>;
  
  // API keys methods
  getApiKeys(userId?: number): Promise<ApiKey[]>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, apiKey: Partial<ApiKey>): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<boolean>;
  
  // Webhook methods
  getWebhooks(userId?: number): Promise<Webhook[]>;
  getWebhook(id: number): Promise<Webhook | undefined>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, webhook: Partial<Webhook>): Promise<Webhook>;
  deleteWebhook(id: number): Promise<boolean>;
  updateWebhookLastTriggered(id: number): Promise<Webhook>;
  
  // Collected data methods
  getCollectedData(): Promise<CollectedData[]>;
  getCollectedDataById(id: number): Promise<CollectedData | undefined>;
  createCollectedData(data: InsertCollectedData): Promise<CollectedData>;
  updateCollectedData(id: number, data: Partial<CollectedData>): Promise<CollectedData>;
  deleteCollectedData(id: number): Promise<boolean>;

  // Processed data methods
  getProcessedData(): Promise<ProcessedData[]>;
  getProcessedDataById(id: number): Promise<ProcessedData | undefined>;
  createProcessedData(data: InsertProcessedData): Promise<ProcessedData>;
  updateProcessedData(id: number, data: Partial<ProcessedData>): Promise<ProcessedData>;
  deleteProcessedData(id: number): Promise<boolean>;

  // Feedback methods
  getFeedbacks(): Promise<Feedback[]>;
  getFeedback(id: number): Promise<Feedback | undefined>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: number, feedback: Partial<Feedback>): Promise<Feedback>;
  deleteFeedback(id: number): Promise<boolean>;

  // Report methods
  getReports(): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, report: Partial<Report>): Promise<Report>;
  deleteReport(id: number): Promise<boolean>;

  // Settings methods
  getSettings(): Promise<Setting[]>;
  getSetting(id: number): Promise<Setting | undefined>;
  getSettingByKey(category: string, key: string): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: number, setting: Partial<Setting>): Promise<Setting>;
  deleteSetting(id: number): Promise<boolean>;

  // Access log methods
  getAccessLogs(): Promise<AccessLog[]>;
  getAccessLog(id: number): Promise<AccessLog | undefined>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;

  // Collaboration: conversations/messages/calls
  getConversationsForUser(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]>;
  markConversationRead(conversationId: number, userId: number): Promise<ConversationParticipant>;

  getMessages(conversationId: number, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: number): Promise<Message | undefined>;
  updateMessage(id: number, data: { body: string; editedAt?: Date }): Promise<Message>;
  deleteMessage(id: number): Promise<Message>;
  getLastMessageForConversation(conversationId: number): Promise<Message | undefined>;
  getUnreadCountForParticipant(conversationId: number, userId: number): Promise<number>;
  getMessageAttachments(messageId: number): Promise<MessageAttachment[]>;
  createMessageAttachment(attachment: InsertMessageAttachment): Promise<MessageAttachment>;

  createCallSession(call: InsertCallSession): Promise<CallSession>;
  endCallSession(callSessionId: number): Promise<CallSession>;
  getCallSession(id: number): Promise<CallSession | undefined>;
  getActiveCallSessions(): Promise<CallSession[]>;
  addCallParticipant(participant: InsertCallParticipant): Promise<CallParticipant>;
  leaveCallParticipant(callSessionId: number, userId: number): Promise<CallParticipant | undefined>;
  leaveCallParticipantByGuestId(callSessionId: number, participantId: number): Promise<CallParticipant | undefined>;

  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });

    // Initialize default data if needed - would be done through migrations
    // this.initializeDefaultData();
  }

  async getConversationsForUser(userId: number): Promise<Conversation[]> {
    const rows = await db
      .select({
        id: conversations.id,
        type: conversations.type,
        title: conversations.title,
        incidentId: conversations.incidentId,
        createdBy: conversations.createdBy,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    return rows as Conversation[];
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
    return row;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [row] = await db.insert(conversations).values(conversation as any).returning();
    return row;
  }

  async addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [row] = await db.insert(conversationParticipants).values(participant as any).returning();
    return row;
  }

  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId))
      .orderBy(desc(conversationParticipants.joinedAt));
  }

  async markConversationRead(conversationId: number, userId: number): Promise<ConversationParticipant> {
    const [row] = await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() as any })
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)))
      .returning();

    if (!row) throw new Error("Conversation participant not found");
    return row;
  }

  async getMessages(conversationId: number, limit = 50): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [row] = await db.select().from(messages).where(eq(messages.id, id));
    return row;
  }

  async updateMessage(id: number, data: { body: string; editedAt?: Date }): Promise<Message> {
    const [row] = await db
      .update(messages)
      .set({ body: data.body, editedAt: (data.editedAt ?? new Date()) as any })
      .where(eq(messages.id, id))
      .returning();
    if (!row) throw new Error("Message not found");
    return row;
  }

  async deleteMessage(id: number): Promise<Message> {
    const [row] = await db
      .update(messages)
      .set({ deletedAt: new Date() as any })
      .where(eq(messages.id, id))
      .returning();
    if (!row) throw new Error("Message not found");
    return row;
  }

  async getLastMessageForConversation(conversationId: number): Promise<Message | undefined> {
    const [row] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    return row;
  }

  async getUnreadCountForParticipant(conversationId: number, userId: number): Promise<number> {
    const [participant] = await db
      .select()
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
    if (!participant) return 0;
    const lastRead = participant.lastReadAt;
    const conditions = [
      eq(messages.conversationId, conversationId),
      isNull(messages.deletedAt),
    ];
    if (lastRead) {
      conditions.push(gt(messages.createdAt, lastRead));
    }
    const allInConvo = await db
      .select({ id: messages.id, senderId: messages.senderId, createdAt: messages.createdAt })
      .from(messages)
      .where(and(...conditions));
    const unread = allInConvo.filter((m) => m.senderId !== userId).length;
    return unread;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [row] = await db.insert(messages).values(message as any).returning();
    await db
      .update(conversations)
      .set({ updatedAt: new Date() as any })
      .where(eq(conversations.id, message.conversationId));
    return row;
  }

  async getMessageAttachments(messageId: number): Promise<MessageAttachment[]> {
    return db
      .select()
      .from(messageAttachments)
      .where(eq(messageAttachments.messageId, messageId))
      .orderBy(desc(messageAttachments.createdAt));
  }

  async createMessageAttachment(attachment: InsertMessageAttachment): Promise<MessageAttachment> {
    const [row] = await db.insert(messageAttachments).values(attachment as any).returning();
    return row;
  }

  async createCallSession(call: InsertCallSession): Promise<CallSession> {
    const [row] = await db.insert(callSessions).values(call as any).returning();
    return row;
  }

  async endCallSession(callSessionId: number): Promise<CallSession> {
    const [row] = await db
      .update(callSessions)
      .set({ status: "ended" as any, endedAt: new Date() as any })
      .where(eq(callSessions.id, callSessionId))
      .returning();
    if (!row) throw new Error("Call session not found");
    return row;
  }

  async getCallSession(id: number): Promise<CallSession | undefined> {
    const [row] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    return row;
  }

  async getActiveCallSessions(): Promise<CallSession[]> {
    return db
      .select()
      .from(callSessions)
      .where(eq(callSessions.status, "active"))
      .orderBy(desc(callSessions.startedAt));
  }

  async addCallParticipant(participant: InsertCallParticipant): Promise<CallParticipant> {
    const [row] = await db.insert(callParticipants).values(participant as any).returning();
    return row;
  }

  async leaveCallParticipant(callSessionId: number, userId: number): Promise<CallParticipant | undefined> {
    const [row] = await db
      .update(callParticipants)
      .set({ leftAt: new Date() as any })
      .where(and(eq(callParticipants.callSessionId, callSessionId), eq(callParticipants.userId, userId)))
      .returning();
    return row;
  }

  async leaveCallParticipantByGuestId(callSessionId: number, participantId: number): Promise<CallParticipant | undefined> {
    const [row] = await db
      .update(callParticipants)
      .set({ leftAt: new Date() as any })
      .where(and(eq(callParticipants.callSessionId, callSessionId), eq(callParticipants.id, participantId)))
      .returning();
    return row;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser as any).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Data source methods
  async getDataSources(): Promise<DataSource[]> {
    return db.select().from(dataSources);
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return dataSource;
  }

  async createDataSource(source: InsertDataSource): Promise<DataSource> {
    const [dataSource] = await db.insert(dataSources).values(source).returning();
    return dataSource;
  }

  async updateDataSource(id: number, sourceData: Partial<DataSource>): Promise<DataSource> {
    const [updatedSource] = await db
      .update(dataSources)
      .set(sourceData)
      .where(eq(dataSources.id, id))
      .returning();
    
    if (!updatedSource) {
      throw new Error(`Data source with id ${id} not found`);
    }
    
    return updatedSource;
  }

  // Incident methods
  async getIncidents(): Promise<Incident[]> {
    return db.select().from(incidents).orderBy(desc(incidents.reportedAt));
  }

  async getIncidentsFiltered(filters: { state?: string; lga?: string; reportingMethod?: string }): Promise<Incident[]> {
    const conditions = [] as any[];
    if (filters.state) conditions.push(eq(incidents.state, filters.state));
    if (filters.lga) conditions.push(eq(incidents.lga, filters.lga));
    if (filters.reportingMethod) conditions.push(eq(incidents.reportingMethod, filters.reportingMethod));

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const query = db.select().from(incidents);
    const rows = whereClause ? await query.where(whereClause).orderBy(desc(incidents.reportedAt)) : await query.orderBy(desc(incidents.reportedAt));
    return rows;
  }

  async getIncident(id: number): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident;
  }

  async getIncidentsByTitle(title: string): Promise<Incident[]> {
    const matchingIncidents = await db.select().from(incidents).where(eq(incidents.title, title));
    return matchingIncidents;
  }
  
  async getIncidentsByRegion(region: string): Promise<Incident[]> {
    const regionIncidents = await db.select().from(incidents).where(eq(incidents.region, region));
    return regionIncidents;
  }
  
  async getIncidentsByLocation(lat: number, lng: number, radiusKm: number = 5): Promise<Incident[]> {
    // Get all incidents
    const allIncidents = await db.select().from(incidents);
    
    // Filter incidents within the radius
    const nearbyIncidents = allIncidents.filter(incident => {
      if (!incident.location) return false;
      
      try {
        const [incLat, incLng] = incident.location.split(',').map(coord => parseFloat(coord.trim()));
        if (isNaN(incLat) || isNaN(incLng)) return false;
        
        // Calculate distance using haversine formula
        const earthRadiusKm = 6371;
        const dLat = this.degreesToRadians(incLat - lat);
        const dLng = this.degreesToRadians(incLng - lng);
        
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(this.degreesToRadians(lat)) * Math.cos(this.degreesToRadians(incLat)) * 
          Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = earthRadiusKm * c;
        
        return distance <= radiusKm;
      } catch (e) {
        return false;
      }
    });
    
    return nearbyIncidents;
  }
  
  private degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [newIncident] = await db.insert(incidents).values([incident]).returning();
    return newIncident;
  }

  async updateIncident(id: number, incidentData: Partial<Incident>): Promise<Incident> {
    const [updatedIncident] = await db
      .update(incidents)
      .set(incidentData)
      .where(eq(incidents.id, id))
      .returning();
    
    if (!updatedIncident) {
      throw new Error(`Incident with id ${id} not found`);
    }
    
    return updatedIncident;
  }
  
  async deleteIncident(id: number): Promise<boolean> {
    const result = await db
      .delete(incidents)
      .where(eq(incidents.id, id))
      .returning();
    return result.length > 0;
  }

  // Case management methods
  async getCases(): Promise<Case[]> {
    return db.select().from(cases).orderBy(desc(cases.updatedAt));
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [row] = await db.select().from(cases).where(eq(cases.id, id));
    return row;
  }

  async createCase(newCase: InsertCase): Promise<Case> {
    const [row] = await db.insert(cases).values([newCase]).returning();
    return row;
  }

  async updateCase(id: number, data: Partial<Case>): Promise<Case> {
    const [row] = await db
      .update(cases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();

    if (!row) throw new Error(`Case with id ${id} not found`);
    return row;
  }

  async deleteCase(id: number): Promise<boolean> {
    const result = await db.delete(cases).where(eq(cases.id, id)).returning();
    return result.length > 0;
  }

  async getCaseNotes(caseId: number): Promise<CaseNote[]> {
    return db.select().from(caseNotes).where(eq(caseNotes.caseId, caseId)).orderBy(desc(caseNotes.createdAt));
  }

  async createCaseNote(note: InsertCaseNote): Promise<CaseNote> {
    const [row] = await db.insert(caseNotes).values([note]).returning();
    return row;
  }

  // Alert methods
  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.generatedAt));
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.status, 'active'))
      .orderBy(desc(alerts.generatedAt));
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values([alert]).returning();
    return newAlert;
  }

  async updateAlert(id: number, alertData: Partial<Alert>): Promise<Alert> {
    const [updatedAlert] = await db
      .update(alerts)
      .set(alertData)
      .where(eq(alerts.id, id))
      .returning();
    
    if (!updatedAlert) {
      throw new Error(`Alert with id ${id} not found`);
    }
    
    return updatedAlert;
  }

  // Response activity methods
  async getResponseActivities(): Promise<ResponseActivity[]> {
    return db.select().from(responseActivities).orderBy(desc(responseActivities.createdAt));
  }

  async getResponseActivity(id: number): Promise<ResponseActivity | undefined> {
    const [activity] = await db.select().from(responseActivities).where(eq(responseActivities.id, id));
    return activity;
  }

  async createResponseActivity(activity: InsertResponseActivity): Promise<ResponseActivity> {
    const [newActivity] = await db.insert(responseActivities).values([activity]).returning();
    return newActivity;
  }

  async updateResponseActivity(id: number, activityData: Partial<ResponseActivity>): Promise<ResponseActivity> {
    const [updatedActivity] = await db
      .update(responseActivities)
      .set(activityData)
      .where(eq(responseActivities.id, id))
      .returning();
    
    if (!updatedActivity) {
      throw new Error(`Response activity with id ${id} not found`);
    }
    
    return updatedActivity;
  }

  // Response team methods
  async getResponseTeams(): Promise<ResponseTeam[]> {
    return db.select().from(responseTeams);
  }

  async getResponseTeam(id: number): Promise<ResponseTeam | undefined> {
    const [team] = await db.select().from(responseTeams).where(eq(responseTeams.id, id));
    return team;
  }

  async createResponseTeam(team: InsertResponseTeam): Promise<ResponseTeam> {
    const [newTeam] = await db.insert(responseTeams).values([team]).returning();
    return newTeam;
  }

  async updateResponseTeam(id: number, teamData: Partial<ResponseTeam>): Promise<ResponseTeam> {
    const [updatedTeam] = await db
      .update(responseTeams)
      .set(teamData)
      .where(eq(responseTeams.id, id))
      .returning();
    
    if (!updatedTeam) {
      throw new Error(`Response team with id ${id} not found`);
    }
    
    return updatedTeam;
  }

  // Risk indicator methods
  async getRiskIndicators(): Promise<RiskIndicator[]> {
    return db.select().from(riskIndicators).orderBy(desc(riskIndicators.timestamp));
  }

  async getRiskIndicator(id: number): Promise<RiskIndicator | undefined> {
    const [indicator] = await db.select().from(riskIndicators).where(eq(riskIndicators.id, id));
    return indicator;
  }

  async createRiskIndicator(indicator: InsertRiskIndicator): Promise<RiskIndicator> {
    const [newIndicator] = await db.insert(riskIndicators).values([indicator]).returning();
    return newIndicator;
  }

  async updateRiskIndicator(id: number, indicatorData: Partial<RiskIndicator>): Promise<RiskIndicator> {
    const [updatedIndicator] = await db
      .update(riskIndicators)
      .set(indicatorData)
      .where(eq(riskIndicators.id, id))
      .returning();
    
    if (!updatedIndicator) {
      throw new Error(`Risk indicator with id ${id} not found`);
    }
    
    return updatedIndicator;
  }

  async getRiskIndicatorsByTimeRange(startDate: Date, endDate: Date): Promise<RiskIndicator[]> {
    return db
      .select()
      .from(riskIndicators)
      .where(
        and(
          gte(riskIndicators.timestamp, startDate),
          lte(riskIndicators.timestamp, endDate)
        )
      )
      .orderBy(desc(riskIndicators.timestamp));
  }

  // Risk analysis methods
  async getRiskAnalyses(): Promise<RiskAnalysis[]> {
    return db.select().from(riskAnalyses).orderBy(desc(riskAnalyses.createdAt));
  }

  async getRiskAnalysis(id: number): Promise<RiskAnalysis | undefined> {
    const [analysis] = await db.select().from(riskAnalyses).where(eq(riskAnalyses.id, id));
    return analysis;
  }

  async createRiskAnalysis(analysis: InsertRiskAnalysis): Promise<RiskAnalysis> {
    const [newAnalysis] = await db.insert(riskAnalyses).values([analysis]).returning();
    return newAnalysis;
  }

  async updateRiskAnalysis(id: number, analysisData: Partial<RiskAnalysis>): Promise<RiskAnalysis> {
    const [updatedAnalysis] = await db
      .update(riskAnalyses)
      .set(analysisData)
      .where(eq(riskAnalyses.id, id))
      .returning();
    
    if (!updatedAnalysis) {
      throw new Error(`Risk analysis with id ${id} not found`);
    }
    
    return updatedAnalysis;
  }
  
  // Response Plan methods
  async getResponsePlans(): Promise<ResponsePlan[]> {
    return db.select().from(responsePlans).orderBy(desc(responsePlans.createdAt));
  }

  async getResponsePlan(id: number): Promise<ResponsePlan | undefined> {
    const [plan] = await db.select().from(responsePlans).where(eq(responsePlans.id, id));
    return plan;
  }

  async createResponsePlan(plan: InsertResponsePlan): Promise<ResponsePlan> {
    const [newPlan] = await db.insert(responsePlans).values([plan]).returning();
    return newPlan;
  }

  async updateResponsePlan(id: number, planData: Partial<ResponsePlan>): Promise<ResponsePlan> {
    const [updatedPlan] = await db
      .update(responsePlans)
      .set(planData)
      .where(eq(responsePlans.id, id))
      .returning();
    
    if (!updatedPlan) {
      throw new Error(`Response plan with id ${id} not found`);
    }
    
    return updatedPlan;
  }

  // API Key methods
  async getApiKeys(userId?: number): Promise<ApiKey[]> {
    if (userId) {
      return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
    }
    return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [newApiKey] = await db.insert(apiKeys).values(apiKey as any).returning();
    return newApiKey;
  }

  async updateApiKey(id: number, apiKeyData: Partial<ApiKey>): Promise<ApiKey> {
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set(apiKeyData)
      .where(eq(apiKeys.id, id))
      .returning();
    
    if (!updatedApiKey) {
      throw new Error(`API key with id ${id} not found`);
    }
    
    return updatedApiKey;
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return true;
  }

  // Webhook methods
  async getWebhooks(userId?: number): Promise<Webhook[]> {
    if (userId) {
      return db.select().from(webhooks).where(eq(webhooks.userId, userId)).orderBy(desc(webhooks.createdAt));
    }
    return db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }

  async getWebhook(id: number): Promise<Webhook | undefined> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return webhook;
  }

  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    const [newWebhook] = await db.insert(webhooks).values(webhook as any).returning();
    return newWebhook;
  }

  async updateWebhook(id: number, webhookData: Partial<Webhook>): Promise<Webhook> {
    const [updatedWebhook] = await db
      .update(webhooks)
      .set(webhookData)
      .where(eq(webhooks.id, id))
      .returning();
    
    if (!updatedWebhook) {
      throw new Error(`Webhook with id ${id} not found`);
    }
    
    return updatedWebhook;
  }

  async deleteWebhook(id: number): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    return true;
  }

  async updateWebhookLastTriggered(id: number): Promise<Webhook> {
    const [updatedWebhook] = await db
      .update(webhooks)
      .set({ lastTriggered: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    
    if (!updatedWebhook) {
      throw new Error(`Webhook with id ${id} not found`);
    }
    
    return updatedWebhook;
  }

  // Collected data methods
  async getCollectedData(): Promise<CollectedData[]> {
    return db.select().from(collectedData).orderBy(desc(collectedData.collectedAt));
  }

  async getCollectedDataById(id: number): Promise<CollectedData | undefined> {
    const [row] = await db.select().from(collectedData).where(eq(collectedData.id, id));
    return row;
  }

  async createCollectedData(data: InsertCollectedData): Promise<CollectedData> {
    const [row] = await db.insert(collectedData).values(data).returning();
    return row;
  }

  async updateCollectedData(id: number, data: Partial<CollectedData>): Promise<CollectedData> {
    const [row] = await db.update(collectedData).set(data).where(eq(collectedData.id, id)).returning();
    if (!row) throw new Error(`Collected data with id ${id} not found`);
    return row;
  }

  async deleteCollectedData(id: number): Promise<boolean> {
    const result = await db.delete(collectedData).where(eq(collectedData.id, id)).returning();
    return result.length > 0;
  }

  // Processed data methods
  async getProcessedData(): Promise<ProcessedData[]> {
    return db.select().from(processedData).orderBy(desc(processedData.processedAt));
  }

  async getProcessedDataById(id: number): Promise<ProcessedData | undefined> {
    const [row] = await db.select().from(processedData).where(eq(processedData.id, id));
    return row;
  }

  async createProcessedData(data: InsertProcessedData): Promise<ProcessedData> {
    const [row] = await db.insert(processedData).values(data).returning();
    return row;
  }

  async updateProcessedData(id: number, data: Partial<ProcessedData>): Promise<ProcessedData> {
    const [row] = await db.update(processedData).set(data).where(eq(processedData.id, id)).returning();
    if (!row) throw new Error(`Processed data with id ${id} not found`);
    return row;
  }

  async deleteProcessedData(id: number): Promise<boolean> {
    const result = await db.delete(processedData).where(eq(processedData.id, id)).returning();
    return result.length > 0;
  }

  // Feedback methods
  async getFeedbacks(): Promise<Feedback[]> {
    return db.select().from(feedbacks).orderBy(desc(feedbacks.submittedAt));
  }

  async getFeedback(id: number): Promise<Feedback | undefined> {
    const [row] = await db.select().from(feedbacks).where(eq(feedbacks.id, id));
    return row;
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const [row] = await db.insert(feedbacks).values(feedback).returning();
    return row;
  }

  async updateFeedback(id: number, data: Partial<Feedback>): Promise<Feedback> {
    const [row] = await db.update(feedbacks).set(data).where(eq(feedbacks.id, id)).returning();
    if (!row) throw new Error(`Feedback with id ${id} not found`);
    return row;
  }

  async deleteFeedback(id: number): Promise<boolean> {
    const result = await db.delete(feedbacks).where(eq(feedbacks.id, id)).returning();
    return result.length > 0;
  }

  // Report methods
  async getReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [row] = await db.select().from(reports).where(eq(reports.id, id));
    return row;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [row] = await db.insert(reports).values(report).returning();
    return row;
  }

  async updateReport(id: number, data: Partial<Report>): Promise<Report> {
    const [row] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    if (!row) throw new Error(`Report with id ${id} not found`);
    return row;
  }

  async deleteReport(id: number): Promise<boolean> {
    const result = await db.delete(reports).where(eq(reports.id, id)).returning();
    return result.length > 0;
  }

  // Settings methods
  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings).orderBy(desc(settings.updatedAt));
  }

  async getSetting(id: number): Promise<Setting | undefined> {
    const [row] = await db.select().from(settings).where(eq(settings.id, id));
    return row;
  }

  async getSettingByKey(category: string, key: string): Promise<Setting | undefined> {
    const [row] = await db.select().from(settings).where(and(eq(settings.category, category), eq(settings.key, key)));
    return row;
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    const [row] = await db.insert(settings).values(setting).returning();
    return row;
  }

  async updateSetting(id: number, data: Partial<Setting>): Promise<Setting> {
    const [row] = await db.update(settings).set(data).where(eq(settings.id, id)).returning();
    if (!row) throw new Error(`Setting with id ${id} not found`);
    return row;
  }

  async deleteSetting(id: number): Promise<boolean> {
    const result = await db.delete(settings).where(eq(settings.id, id)).returning();
    return result.length > 0;
  }

  // Access log methods
  async getAccessLogs(): Promise<AccessLog[]> {
    return db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp));
  }

  async getAccessLog(id: number): Promise<AccessLog | undefined> {
    const [row] = await db.select().from(accessLogs).where(eq(accessLogs.id, id));
    return row;
  }

  async createAccessLog(log: InsertAccessLog): Promise<AccessLog> {
    const [row] = await db.insert(accessLogs).values(log).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();

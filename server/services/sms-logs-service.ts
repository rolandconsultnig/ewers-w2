/**
 * SMS Logs & Templates Service - Persist sent messages and manage templates
 */
import { db } from "../db";
import { smsLogs, smsTemplates, incomingSms } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export async function logSmsSend(params: {
  recipient: string;
  message: string;
  status: "pending" | "delivered" | "failed";
  externalId?: string;
  sentBy?: number;
}) {
  const [row] = await db.insert(smsLogs).values(params).returning();
  return row;
}

export async function getSmsLogs(limit = 50) {
  return db.select().from(smsLogs).orderBy(desc(smsLogs.sentAt)).limit(limit);
}

export async function getSmsTemplates() {
  return db.select().from(smsTemplates).orderBy(smsTemplates.name);
}

export async function createSmsTemplate(name: string, content: string) {
  const [row] = await db.insert(smsTemplates).values({ name, content }).returning();
  return row;
}

export async function updateSmsTemplate(id: number, name: string, content: string) {
  const [row] = await db
    .update(smsTemplates)
    .set({ name, content })
    .where(eq(smsTemplates.id, id))
    .returning();
  return row;
}

export async function deleteSmsTemplate(id: number) {
  await db.delete(smsTemplates).where(eq(smsTemplates.id, id));
}

const DEFAULT_TEMPLATES = [
  { name: "Security Alert", content: "Alert: Security situation deteriorating in [LOCATION]. Avoid areas near [LANDMARK]. IPCR is monitoring the situation closely." },
  { name: "Road Closure", content: "Update: Road closures in [LOCATION] due to [REASON]. Seek alternative routes via [ALTERNATIVE]. Expected to reopen at [TIME]." },
  { name: "Civil Unrest", content: "Warning: Potential civil unrest reported in [LOCATION]. Please stay indoors and avoid [AREAS]. Contact [NUMBER] for emergency assistance." },
  { name: "Community Meeting", content: "IPCR: Community dialogue session scheduled for [DATE] in [LOCATION] at [TIME]. Topic: [TOPIC]. Your participation is important." },
  { name: "Report Reminder", content: "Reminder: Submit security reports for [REGION] by [DEADLINE]. Contact [NAME] at [NUMBER] for assistance." },
];

export async function seedDefaultTemplates() {
  const existing = await db.select().from(smsTemplates).limit(1);
  if (existing.length > 0) return;
  for (const t of DEFAULT_TEMPLATES) {
    await db.insert(smsTemplates).values(t);
  }
}

export async function getIncomingSms(limit = 50) {
  return db.select().from(incomingSms).orderBy(desc(incomingSms.receivedAt)).limit(limit);
}

export async function storeIncomingSms(params: {
  sender: string;
  content: string;
  twilioSid?: string;
  location?: string;
}) {
  const [row] = await db.insert(incomingSms).values(params).returning();
  return row;
}

export async function markIncomingSmsRead(id: number) {
  await db.update(incomingSms).set({ status: "read" }).where(eq(incomingSms.id, id));
}

export async function markAllIncomingSmsRead() {
  await db.update(incomingSms).set({ status: "read" }).where(eq(incomingSms.status, "new"));
}

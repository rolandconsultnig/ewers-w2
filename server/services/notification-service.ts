/**
 * Notification Service - User notifications management
 */
import { db } from "../db";
import { notifications } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Notification, InsertNotification } from "@shared/schema";

export async function getNotifications(userId: number): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(data: InsertNotification): Promise<Notification> {
  const [n] = await db.insert(notifications).values(data).returning();
  return n;
}

export async function markAsRead(id: number, userId: number): Promise<Notification | undefined> {
  const [n] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  return n;
}

export async function markAllAsRead(userId: number): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId))
    .returning();
  return result.length;
}

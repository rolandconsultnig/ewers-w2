/**
 * Push Notification Service - Web Push for alerts
 */
import webpush from "web-push";
import { logger } from "./logger";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    "mailto:noreply@ipcr.gov.ng",
    vapidPublic,
    vapidPrivate
  );
}

const subscriptions = new Map<number, webpush.PushSubscription[]>();

export function addPushSubscription(userId: number, subscription: webpush.PushSubscription) {
  const list = subscriptions.get(userId) || [];
  list.push(subscription);
  subscriptions.set(userId, list);
}

export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  if (!vapidPublic || !vapidPrivate) {
    logger.debug("Push notifications not configured");
    return false;
  }

  const list = subscriptions.get(userId) || [];
  const payload = JSON.stringify({ title, body, url: url || "/alerts" });

  for (const sub of list) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      logger.warn("Push send failed", { userId, error: err });
    }
  }
  return list.length > 0;
}

export async function sendPushToAll(
  title: string,
  body: string,
  url?: string
): Promise<number> {
  let count = 0;
  for (const userId of Array.from(subscriptions.keys())) {
    if (await sendPushToUser(userId, title, body, url)) count++;
  }
  return count;
}

export function getVapidPublic(): string | null {
  return vapidPublic || null;
}

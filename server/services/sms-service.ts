/**
 * SMS Service - Twilio integration for emergency notifications
 */
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client || !fromNumber) {
    console.warn("Twilio not configured. SMS not sent.");
    return { success: false, error: "SMS service not configured" };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to.startsWith("+") ? to : `+234${to.replace(/^0/, "")}`,
    });
    return { success: true, sid: result.sid };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("SMS send failed:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{ success: number; failed: number; results: Array<{ to: string; success: boolean; error?: string }> }> {
  const results: Array<{ to: string; success: boolean; error?: string }> = [];
  let successCount = 0;

  for (const to of recipients) {
    const result = await sendSMS(to, message);
    results.push({ to, success: result.success, error: result.error });
    if (result.success) successCount++;
  }

  return {
    success: successCount,
    failed: recipients.length - successCount,
    results,
  };
}

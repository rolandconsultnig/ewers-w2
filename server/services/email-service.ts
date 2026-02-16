/**
 * Email Service - Multi-provider email (SendGrid + SMTP fallback) with templating
 */
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "./logger";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

let smtpTransporter: Transporter | null = null;

if (
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  logger.info("SMTP transporter configured");
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

const templates: Record<string, (data: Record<string, string>) => EmailTemplate> = {
  crisis_alert: (data) => ({
    subject: `[URGENT] Crisis Alert: ${data.title || "New Incident"}`,
    text: `Crisis Alert\n\n${data.description || "A new crisis has been reported."}\n\nLocation: ${data.location || "N/A"}\nSeverity: ${data.severity || "N/A"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #dc2626;">Crisis Alert</h2>
        <p><strong>${data.title || "New Incident"}</strong></p>
        <p>${data.description || "A new crisis has been reported."}</p>
        <p><strong>Location:</strong> ${data.location || "N/A"}</p>
        <p><strong>Severity:</strong> ${data.severity || "N/A"}</p>
      </div>
    `,
  }),
  user_invite: (data) => ({
    subject: `You've been invited to ${data.appName || "IPCR Early Alert Network"}`,
    text: `Welcome! Your account has been created.\n\nUsername: ${data.username}\nTemporary password: ${data.password}\n\nPlease log in and change your password.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome to ${data.appName || "IPCR Early Alert Network"}</h2>
        <p>Your account has been created.</p>
        <p><strong>Username:</strong> ${data.username}</p>
        <p><strong>Temporary password:</strong> ${data.password}</p>
        <p>Please log in and change your password.</p>
      </div>
    `,
  }),
  password_reset: (data) => ({
    subject: `Password Reset - ${data.appName || "IPCR Early Alert Network"}`,
    text: `You requested a password reset.\n\nClick the link below to reset your password (valid for 1 hour):\n${data.resetUrl}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p><a href="${data.resetUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    `,
  }),
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const from = options.from || process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || "noreply@ipcr.gov.ng";

  if (SENDGRID_API_KEY) {
    try {
      const text = options.text || options.html || "";
      const html = options.html || options.text || "";
      await sgMail.send({
        to: toList,
        from,
        subject: options.subject,
        text,
        html,
        replyTo: options.replyTo,
      });
      return true;
    } catch (error) {
      logger.warn("SendGrid failed, trying SMTP fallback", { error });
    }
  }

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        to: toList.join(", "),
        from,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
        replyTo: options.replyTo,
      });
      return true;
    } catch (error) {
      logger.error("SMTP send failed", { error });
      return false;
    }
  }

  logger.warn("No email provider configured. Email not sent.");
  return false;
}

export function sendTemplatedEmail(
  templateName: string,
  to: string | string[],
  data: Record<string, string>
): Promise<boolean> {
  const template = templates[templateName];
  if (!template) {
    console.error(`Email template '${templateName}' not found`);
    return Promise.resolve(false);
  }
  const { subject, text, html } = template(data);
  return sendEmail({ to, subject, text, html });
}

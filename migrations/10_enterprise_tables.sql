-- Enterprise: Alert Templates
CREATE TABLE IF NOT EXISTS "alert_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'medium',
  "title_template" text NOT NULL,
  "body_template" text NOT NULL,
  "channels" text[],
  "escalation_level" integer DEFAULT 3,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" integer
);

-- Enterprise: Risk Zones
CREATE TABLE IF NOT EXISTS "risk_zones" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "region" text NOT NULL DEFAULT 'Nigeria',
  "state" text,
  "coordinates" jsonb,
  "risk_level" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Enterprise: Escalation Rules
CREATE TABLE IF NOT EXISTS "escalation_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "trigger_severity" text NOT NULL,
  "sla_minutes" integer NOT NULL,
  "escalate_to_level" integer NOT NULL,
  "notify_roles" text[],
  "active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);

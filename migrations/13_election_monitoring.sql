-- Election Monitoring Module
CREATE TABLE IF NOT EXISTS "elections" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "region" text NOT NULL DEFAULT 'Nigeria',
  "state" text,
  "election_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'pre_election',
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "political_parties" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "abbreviation" text,
  "logo_url" text,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "politicians" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" text NOT NULL,
  "party_id" integer REFERENCES "political_parties"("id"),
  "election_id" integer REFERENCES "elections"("id"),
  "position" text,
  "state" text,
  "lga" text,
  "photo_url" text,
  "bio" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "election_actors" (
  "id" serial PRIMARY KEY NOT NULL,
  "election_id" integer NOT NULL REFERENCES "elections"("id"),
  "name" text NOT NULL,
  "type" text NOT NULL,
  "role" text,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "election_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "election_id" integer NOT NULL REFERENCES "elections"("id"),
  "title" text NOT NULL,
  "description" text,
  "type" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'medium',
  "location" text,
  "state" text,
  "lga" text,
  "event_date" timestamp DEFAULT now() NOT NULL,
  "party_id" integer REFERENCES "political_parties"("id"),
  "politician_id" integer REFERENCES "politicians"("id"),
  "actor_id" integer REFERENCES "election_actors"("id"),
  "incident_id" integer REFERENCES "incidents"("id"),
  "reported_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

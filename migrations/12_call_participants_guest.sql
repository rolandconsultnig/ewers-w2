-- Allow guest participants: userId nullable, add guest display name
ALTER TABLE "call_participants" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "call_participants" ADD COLUMN IF NOT EXISTS "guest_display_name" text;

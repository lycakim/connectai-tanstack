ALTER TABLE "agents" ADD COLUMN "production" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "system_prompt" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "welcome_message" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "voice_provider" text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "voice_model" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "voice" text;
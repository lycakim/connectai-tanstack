ALTER TABLE "http_tools" ADD COLUMN "headers" jsonb;--> statement-breakpoint
ALTER TABLE "http_tools" ADD COLUMN "auth_type" text;--> statement-breakpoint
ALTER TABLE "http_tools" ADD COLUMN "auth_config" jsonb;
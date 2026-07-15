ALTER TABLE "http_tools" ADD COLUMN "static_parameters" jsonb;--> statement-breakpoint
ALTER TABLE "http_tools" ADD COLUMN "system_tool" boolean DEFAULT false NOT NULL;
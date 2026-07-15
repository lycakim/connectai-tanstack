CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" text NOT NULL,
	"agent_id" integer NOT NULL,
	"voice_provider" text,
	"caller_number" text,
	"called_number" text,
	"domain_name" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"duration" integer,
	"status" text DEFAULT 'completed' NOT NULL,
	"transcript" jsonb,
	"ai_summary" text,
	"ai_topics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
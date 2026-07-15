CREATE TABLE "http_tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"http_method" text DEFAULT 'GET' NOT NULL,
	"url" text NOT NULL,
	"parameters" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"headers" jsonb,
	"tools" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "connectware_failover_extension" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "reseller" text;--> statement-breakpoint
ALTER TABLE "http_tools" ADD CONSTRAINT "http_tools_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"total_steps" integer DEFAULT 5 NOT NULL,
	"step_title" text DEFAULT 'Starting analysis...' NOT NULL,
	"step_description" text,
	"is_completed" integer DEFAULT 0 NOT NULL,
	"error" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;
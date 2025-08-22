ALTER TABLE "progress" ALTER COLUMN "total_steps" SET DEFAULT 6;--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "step_results" text;
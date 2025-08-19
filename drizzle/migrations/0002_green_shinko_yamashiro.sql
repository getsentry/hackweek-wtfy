ALTER TABLE "progress" ALTER COLUMN "request_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "results" ALTER COLUMN "request_id" SET DATA TYPE text;
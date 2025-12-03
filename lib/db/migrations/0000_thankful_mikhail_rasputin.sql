-- Safely create enums
DO $$ BEGIN
 CREATE TYPE "public"."anomaly_status" AS ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."anomaly_type" AS ENUM('MISSING', 'UNEXPECTED', 'MISPLACED', 'MISMATCH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."severity" AS ENUM('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Safely add columns to existing tables
DO $$ BEGIN
    ALTER TABLE "sites" ADD COLUMN "clli" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "racks" ADD COLUMN "rack_order" integer;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "racks" ADD COLUMN "width_mm" integer DEFAULT 600;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "racks" ADD COLUMN "depth_mm" integer DEFAULT 1200;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "racks" ADD COLUMN "height_mm" integer;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "devices" ADD COLUMN "customer" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "devices" ADD COLUMN "source_system" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "devices" ADD COLUMN "width_mm" integer;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "devices" ADD COLUMN "depth_mm" integer;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create anomalies table if it doesn't exist
CREATE TABLE IF NOT EXISTS "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"device_id" uuid,
	"rack_name" text,
	"anomaly_type" "anomaly_type" NOT NULL,
	"severity" "severity" NOT NULL,
	"expected_value" jsonb,
	"actual_value" jsonb,
	"status" "anomaly_status" DEFAULT 'OPEN' NOT NULL,
	"resolution" text,
	"resolution_action" text,
	"assigned_to" uuid,
	"resolved_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys for anomalies (safely)
DO $$ BEGIN
    ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
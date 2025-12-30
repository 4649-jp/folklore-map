-- CreateEnum
CREATE TYPE "IconType" AS ENUM ('ONI', 'KITSUNE', 'DOG', 'DRAGON', 'TEMPLE', 'SHRINE', 'ANIMAL', 'GENERIC');

-- CreateEnum
CREATE TYPE "SpotStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('URL', 'BOOK', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('INAPPROPRIATE', 'WRONG_INFO', 'DISCRIMINATION', 'PRIVACY');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "icon_type" "IconType" NOT NULL DEFAULT 'GENERIC',
    "era_hint" TEXT,
    "blur_radius_m" INTEGER NOT NULL,
    "status" "SpotStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "spot_id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "citation" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "spot_id" TEXT NOT NULL,
    "reason" "FlagReason" NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail_json" JSONB,
    "by" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Spot_status_updated_at_idx" ON "Spot"("status", "updated_at");

-- CreateIndex
CREATE INDEX "Source_spot_id_idx" ON "Source"("spot_id");

-- CreateIndex
CREATE INDEX "Flag_spot_id_idx" ON "Flag"("spot_id");

-- CreateIndex
CREATE INDEX "Audit_entity_entity_id_idx" ON "Audit"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;


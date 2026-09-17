-- AlterTable
ALTER TABLE "household" ADD COLUMN     "calorie_target_per_serving" INTEGER,
ADD COLUMN     "cuisine_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kitchen_equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferred_stores" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "onboarding_message" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_message_household_id_idx" ON "onboarding_message"("household_id");

-- AddForeignKey
ALTER TABLE "onboarding_message" ADD CONSTRAINT "onboarding_message_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

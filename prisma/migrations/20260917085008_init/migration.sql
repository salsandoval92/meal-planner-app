-- CreateEnum
CREATE TYPE "StorageMethod" AS ENUM ('FRIDGE', 'FREEZER', 'PANTRY');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('PHOTO', 'GROCERY_LIST', 'MANUAL');

-- CreateTable
CREATE TABLE "household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "budget_target" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_member" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pantry_item" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "storage_method" "StorageMethod" NOT NULL,
    "purchase_date" TIMESTAMP(3),
    "estimated_expiry_date" TIMESTAMP(3),
    "source" "ItemSource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pantry_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_life_reference" (
    "id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "storage_method" "StorageMethod" NOT NULL,
    "estimated_days_min" INTEGER NOT NULL,
    "estimated_days_max" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "shelf_life_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cuisine" TEXT,
    "ingredients" JSONB NOT NULL,
    "steps" TEXT[],
    "required_tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimated_cost_per_serving" DECIMAL(10,2),
    "servings" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "estimated_total_cost" DECIMAL(10,2),
    "cost_per_serving" DECIMAL(10,2),
    "waste_score" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_recipe" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "cooked" BOOLEAN NOT NULL DEFAULT false,
    "cooked_at" TIMESTAMP(3),

    CONSTRAINT "meal_plan_recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_list_item" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "quantity_needed" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "estimated_price" DECIMAL(10,2),
    "actual_price" DECIMAL(10,2),
    "store" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "grocery_list_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_price_estimate" (
    "id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "avg_price" DECIMAL(10,2) NOT NULL,
    "region" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_price_estimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pantry_item_household_id_idx" ON "pantry_item"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_life_reference_ingredient_name_region_storage_method_key" ON "shelf_life_reference"("ingredient_name", "region", "storage_method");

-- CreateIndex
CREATE INDEX "meal_plan_household_id_idx" ON "meal_plan"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_price_estimate_ingredient_name_unit_region_key" ON "ingredient_price_estimate"("ingredient_name", "unit", "region");

-- AddForeignKey
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_item" ADD CONSTRAINT "pantry_item_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan" ADD CONSTRAINT "meal_plan_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_recipe" ADD CONSTRAINT "meal_plan_recipe_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_recipe" ADD CONSTRAINT "meal_plan_recipe_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_list_item" ADD CONSTRAINT "grocery_list_item_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

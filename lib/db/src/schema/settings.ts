import { pgTable, serial, numeric, jsonb } from "drizzle-orm/pg-core";

export const taxSettingsTable = pgTable("tax_settings", {
  id: serial("id").primaryKey(),
  taxRate: numeric("tax_rate").notNull(),
});

export type TaxSettings = typeof taxSettingsTable.$inferSelect;

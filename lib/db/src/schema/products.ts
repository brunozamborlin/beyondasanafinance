import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  defaultPrice: integer("default_price").notNull(),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  type: text("type").default("other").notNull(), // "subscription" | "classpack" | "other"
  durationMonths: integer("duration_months"),
  classCount: integer("class_count"),
});

export type Product = typeof productsTable.$inferSelect;

import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const otherCostsTable = pgTable("other_costs", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
});

export type OtherCost = typeof otherCostsTable.$inferSelect;

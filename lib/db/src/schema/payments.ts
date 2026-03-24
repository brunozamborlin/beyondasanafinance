import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Payment = typeof paymentsTable.$inferSelect;

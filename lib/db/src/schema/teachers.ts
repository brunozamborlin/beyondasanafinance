import { pgTable, serial, text, integer, boolean, numeric } from "drizzle-orm/pg-core";

export const teachersTable = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  compensationType: text("compensation_type").notNull(),
  hourlyRate: integer("hourly_rate"),
  active: boolean("active").default(true).notNull(),
});

export const teacherMonthlyHoursTable = pgTable("teacher_monthly_hours", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id),
  month: text("month").notNull(),
  hoursWorked: numeric("hours_worked").notNull(),
  manualCost: integer("manual_cost"),
});

export type Teacher = typeof teachersTable.$inferSelect;
export type TeacherMonthlyHours = typeof teacherMonthlyHoursTable.$inferSelect;

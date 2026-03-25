import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, paymentsTable, teachersTable, teacherMonthlyHoursTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/warnings/missing-teacher-costs", async (_req, res): Promise<void> => {
  // Get all months that have payments
  const monthsWithRevenue = await db
    .select({ month: sql<string>`DISTINCT to_char(${paymentsTable.date}::date, 'YYYY-MM')` })
    .from(paymentsTable)
    .orderBy(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') DESC`);

  const months = monthsWithRevenue.map((r) => r.month);

  // Get all active teachers
  const activeTeachers = await db
    .select({ id: teachersTable.id, name: teachersTable.name })
    .from(teachersTable)
    .where(eq(teachersTable.active, true));

  // Get all teacher_monthly_hours entries
  const allHours = await db
    .select({
      teacherId: teacherMonthlyHoursTable.teacherId,
      month: teacherMonthlyHoursTable.month,
    })
    .from(teacherMonthlyHoursTable);

  const hoursSet = new Set(allHours.map((h) => `${h.teacherId}:${h.month}`));

  // For each teacher, find months missing data
  const teachers = activeTeachers.map((t) => {
    const missingMonths = months.filter((m) => !hoursSet.has(`${t.id}:${m}`));
    return { id: t.id, name: t.name, missingMonths };
  }).filter((t) => t.missingMonths.length > 0);

  // Aggregate all missing months
  const allMissingMonths = [...new Set(teachers.flatMap((t) => t.missingMonths))].sort();

  res.json({ months: allMissingMonths, teachers });
});

export default router;

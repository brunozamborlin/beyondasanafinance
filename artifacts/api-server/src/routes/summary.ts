import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, paymentsTable, teachersTable, teacherMonthlyHoursTable, otherCostsTable, taxSettingsTable } from "@workspace/db";
import {
  GetMonthlySummaryParams,
  GetMonthlySummaryResponse,
  GetMonthlyHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function computeSummary(month: string) {
  const revenueResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)` })
    .from(paymentsTable)
    .where(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') = ${month}`);

  const revenue = Number(revenueResult[0]?.total ?? 0);

  const teachers = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.active, true));

  const hoursRecords = await db
    .select()
    .from(teacherMonthlyHoursTable)
    .where(eq(teacherMonthlyHoursTable.month, month));

  const hoursMap = new Map(hoursRecords.map((h) => [h.teacherId, h]));

  let teacherCosts = 0;
  for (const teacher of teachers) {
    const hourRecord = hoursMap.get(teacher.id);
    if (!hourRecord) continue;
    if (teacher.compensationType === "manual") {
      teacherCosts += hourRecord.manualCost ?? 0;
    } else {
      teacherCosts += Math.round(Number(hourRecord.hoursWorked) * (teacher.hourlyRate ?? 0));
    }
  }

  const otherCostsResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${otherCostsTable.amount}), 0)` })
    .from(otherCostsTable)
    .where(eq(otherCostsTable.month, month));

  const otherCosts = Number(otherCostsResult[0]?.total ?? 0);

  const [taxSettings] = await db.select().from(taxSettingsTable).limit(1);
  const taxRate = taxSettings ? Number(taxSettings.taxRate) : 0;
  const taxableIncome = revenue - teacherCosts - otherCosts;
  const estimatedTaxes = taxableIncome > 0 ? Math.round(taxableIncome * taxRate / 100) : 0;

  const netProfit = revenue - teacherCosts - otherCosts - estimatedTaxes;

  return {
    month,
    revenue,
    teacherCosts,
    otherCosts,
    estimatedTaxes,
    netProfit,
  };
}

router.get("/summary/history", async (_req, res): Promise<void> => {
  const monthsResult = await db
    .select({ month: sql<string>`DISTINCT to_char(${paymentsTable.date}::date, 'YYYY-MM')` })
    .from(paymentsTable)
    .orderBy(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') DESC`);

  const summaries = [];
  for (const row of monthsResult) {
    const summary = await computeSummary(row.month);
    summaries.push(summary);
  }

  res.json(GetMonthlyHistoryResponse.parse(summaries));
});

router.get("/summary/:month", async (req, res): Promise<void> => {
  const params = GetMonthlySummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const summary = await computeSummary(params.data.month);
  res.json(GetMonthlySummaryResponse.parse(summary));
});

export default router;

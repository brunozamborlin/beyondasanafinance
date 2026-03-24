import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, paymentsTable, productsTable, customersTable, teachersTable, teacherMonthlyHoursTable, otherCostsTable, taxSettingsTable } from "@workspace/db";
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

router.get("/summary/dashboard", async (_req, res): Promise<void> => {
  const monthsResult = await db
    .select({ month: sql<string>`DISTINCT to_char(${paymentsTable.date}::date, 'YYYY-MM')` })
    .from(paymentsTable)
    .orderBy(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') ASC`);

  const monthlyData = [];
  for (const row of monthsResult) {
    const summary = await computeSummary(row.month);
    monthlyData.push(summary);
  }

  const productStats = await db
    .select({
      productId: paymentsTable.productId,
      productName: productsTable.name,
      count: sql<number>`COUNT(*)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)::int`,
    })
    .from(paymentsTable)
    .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
    .groupBy(paymentsTable.productId, productsTable.name)
    .orderBy(sql`COUNT(*) DESC`);

  const paymentMethodStats = await db
    .select({
      method: paymentsTable.paymentMethod,
      count: sql<number>`COUNT(*)::int`,
      totalAmount: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)::int`,
    })
    .from(paymentsTable)
    .groupBy(paymentsTable.paymentMethod)
    .orderBy(sql`COUNT(*) DESC`);

  const teacherStats = await db
    .select({
      teacherId: teacherMonthlyHoursTable.teacherId,
      teacherName: teachersTable.name,
      totalHours: sql<number>`COALESCE(SUM(${teacherMonthlyHoursTable.hoursWorked}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(CASE WHEN ${teachersTable.compensationType} = 'manual' THEN ${teacherMonthlyHoursTable.manualCost} ELSE ${teacherMonthlyHoursTable.hoursWorked} * ${teachersTable.hourlyRate} END), 0)::int`,
      monthsActive: sql<number>`COUNT(DISTINCT ${teacherMonthlyHoursTable.month})::int`,
    })
    .from(teacherMonthlyHoursTable)
    .innerJoin(teachersTable, eq(teacherMonthlyHoursTable.teacherId, teachersTable.id))
    .groupBy(teacherMonthlyHoursTable.teacherId, teachersTable.name)
    .orderBy(sql`SUM(CASE WHEN ${teachersTable.compensationType} = 'manual' THEN ${teacherMonthlyHoursTable.manualCost} ELSE ${teacherMonthlyHoursTable.hoursWorked} * ${teachersTable.hourlyRate} END) DESC`);

  const totalRevenueAll = monthlyData.reduce((sum: number, m: any) => sum + m.revenue, 0);
  const totalTeacherCostsAll = monthlyData.reduce((sum: number, m: any) => sum + m.teacherCosts, 0);

  const teacherProfitability = teacherStats.map((t: any) => {
    const costShare = totalTeacherCostsAll > 0 ? t.totalCost / totalTeacherCostsAll : 0;
    const attributedRevenue = Math.round(totalRevenueAll * costShare);
    const profit = attributedRevenue - t.totalCost;
    return {
      ...t,
      attributedRevenue,
      profit,
    };
  }).sort((a: any, b: any) => b.profit - a.profit);

  const topCustomers = await db
    .select({
      customerId: paymentsTable.customerId,
      customerName: customersTable.fullName,
      count: sql<number>`COUNT(*)::int`,
      totalSpent: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)::int`,
    })
    .from(paymentsTable)
    .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .groupBy(paymentsTable.customerId, customersTable.fullName)
    .orderBy(sql`SUM(${paymentsTable.amount}) DESC`)
    .limit(10);

  res.json({
    monthlyData,
    productStats,
    paymentMethodStats,
    teacherStats: teacherProfitability,
    topCustomers,
  });
});

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

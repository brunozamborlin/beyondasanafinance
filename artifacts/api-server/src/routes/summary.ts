import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, paymentsTable, productsTable, customersTable, teachersTable, teacherMonthlyHoursTable, otherCostsTable, taxSettingsTable } from "@workspace/db";
import {
  GetMonthlySummaryParams,
  GetMonthlySummaryResponse,
  GetMonthlyHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Batch-compute summaries for all months in a single set of queries
async function computeAllSummaries() {
  // 1. Revenue per month
  const revenueByMonth = await db
    .select({
      month: sql<string>`to_char(${paymentsTable.date}::date, 'YYYY-MM')`,
      total: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
    })
    .from(paymentsTable)
    .groupBy(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') ASC`);

  if (revenueByMonth.length === 0) return [];

  // 2. Teacher costs per month (single query)
  const teacherCostsByMonth = await db
    .select({
      month: teacherMonthlyHoursTable.month,
      totalCost: sql<number>`COALESCE(SUM(CASE WHEN ${teachersTable.compensationType} = 'manual' THEN ${teacherMonthlyHoursTable.manualCost} ELSE ROUND(${teacherMonthlyHoursTable.hoursWorked} * ${teachersTable.hourlyRate}) END), 0)`,
    })
    .from(teacherMonthlyHoursTable)
    .innerJoin(teachersTable, eq(teacherMonthlyHoursTable.teacherId, teachersTable.id))
    .where(eq(teachersTable.active, true))
    .groupBy(teacherMonthlyHoursTable.month);

  // 3. Other costs per month (excluding "tasse" category)
  const otherCostsByMonth = await db
    .select({
      month: otherCostsTable.month,
      total: sql<number>`COALESCE(SUM(CASE WHEN ${otherCostsTable.category} != 'tasse' THEN ${otherCostsTable.amount} ELSE 0 END), 0)`,
      manualTaxes: sql<number>`COALESCE(SUM(CASE WHEN ${otherCostsTable.category} = 'tasse' THEN ${otherCostsTable.amount} ELSE 0 END), 0)`,
    })
    .from(otherCostsTable)
    .groupBy(otherCostsTable.month);

  // 4. Tax settings (single query)
  const [taxSettings] = await db.select().from(taxSettingsTable).limit(1);
  const taxRate = taxSettings ? Number(taxSettings.taxRate) : 0;

  // Build lookup maps
  const teacherCostsMap = new Map(teacherCostsByMonth.map((r) => [r.month, Number(r.totalCost)]));
  const otherCostsMap = new Map(otherCostsByMonth.map((r) => [r.month, { otherCosts: Number(r.total), manualTaxes: Number(r.manualTaxes) }]));

  return revenueByMonth.map((r) => {
    const revenue = Number(r.total);
    const teacherCosts = teacherCostsMap.get(r.month) ?? 0;
    const entry = otherCostsMap.get(r.month);
    const otherCosts = entry?.otherCosts ?? 0;
    const manualTaxes = entry?.manualTaxes ?? 0;
    // Use manual taxes if set, otherwise auto-calculate
    const taxableIncome = revenue - teacherCosts - otherCosts;
    const estimatedTaxes = manualTaxes > 0 ? manualTaxes : (taxableIncome > 0 ? Math.round(taxableIncome * taxRate / 100) : 0);
    const netProfit = revenue - teacherCosts - otherCosts - estimatedTaxes;

    return { month: r.month, revenue, teacherCosts, otherCosts, estimatedTaxes, netProfit };
  });
}

// Single-month summary (still used by /summary/:month)
async function computeSummary(month: string) {
  const [revenueResult, teacherCostsResult, otherCostsResult, [taxSettings]] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)` })
      .from(paymentsTable)
      .where(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') = ${month}`),
    db.select({
        totalCost: sql<number>`COALESCE(SUM(CASE WHEN ${teachersTable.compensationType} = 'manual' THEN ${teacherMonthlyHoursTable.manualCost} ELSE ROUND(${teacherMonthlyHoursTable.hoursWorked} * ${teachersTable.hourlyRate}) END), 0)`,
      })
      .from(teacherMonthlyHoursTable)
      .innerJoin(teachersTable, eq(teacherMonthlyHoursTable.teacherId, teachersTable.id))
      .where(eq(teacherMonthlyHoursTable.month, month)),
    db.select({
        total: sql<number>`COALESCE(SUM(CASE WHEN ${otherCostsTable.category} != 'tasse' THEN ${otherCostsTable.amount} ELSE 0 END), 0)`,
        manualTaxes: sql<number>`COALESCE(SUM(CASE WHEN ${otherCostsTable.category} = 'tasse' THEN ${otherCostsTable.amount} ELSE 0 END), 0)`,
      })
      .from(otherCostsTable)
      .where(eq(otherCostsTable.month, month)),
    db.select().from(taxSettingsTable).limit(1),
  ]);

  const revenue = Number(revenueResult[0]?.total ?? 0);
  const teacherCosts = Number(teacherCostsResult[0]?.totalCost ?? 0);
  const otherCosts = Number(otherCostsResult[0]?.total ?? 0);
  const manualTaxes = Number(otherCostsResult[0]?.manualTaxes ?? 0);
  const taxRate = taxSettings ? Number(taxSettings.taxRate) : 0;
  const taxableIncome = revenue - teacherCosts - otherCosts;
  const estimatedTaxes = manualTaxes > 0 ? manualTaxes : (taxableIncome > 0 ? Math.round(taxableIncome * taxRate / 100) : 0);
  const netProfit = revenue - teacherCosts - otherCosts - estimatedTaxes;

  return { month, revenue, teacherCosts, otherCosts, estimatedTaxes, netProfit };
}

router.get("/summary/dashboard", async (_req, res): Promise<void> => {
  // Run all queries in parallel
  const [monthlyData, productStats, paymentMethodStats, teacherStats, topCustomers] = await Promise.all([
    computeAllSummaries(),
    db.select({
        productId: paymentsTable.productId,
        productName: productsTable.name,
        count: sql<number>`COUNT(*)::int`,
        totalRevenue: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)::int`,
      })
      .from(paymentsTable)
      .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
      .groupBy(paymentsTable.productId, productsTable.name)
      .orderBy(sql`COUNT(*) DESC`),
    db.select({
        method: paymentsTable.paymentMethod,
        count: sql<number>`COUNT(*)::int`,
        totalAmount: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)::int`,
      })
      .from(paymentsTable)
      .groupBy(paymentsTable.paymentMethod)
      .orderBy(sql`COUNT(*) DESC`),
    db.select({
        teacherId: teacherMonthlyHoursTable.teacherId,
        teacherName: teachersTable.name,
        totalHours: sql<number>`COALESCE(SUM(${teacherMonthlyHoursTable.hoursWorked}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CASE WHEN ${teachersTable.compensationType} = 'manual' THEN ${teacherMonthlyHoursTable.manualCost} ELSE ${teacherMonthlyHoursTable.hoursWorked} * ${teachersTable.hourlyRate} END), 0)::int`,
        monthsActive: sql<number>`COUNT(DISTINCT ${teacherMonthlyHoursTable.month})::int`,
      })
      .from(teacherMonthlyHoursTable)
      .innerJoin(teachersTable, eq(teacherMonthlyHoursTable.teacherId, teachersTable.id))
      .groupBy(teacherMonthlyHoursTable.teacherId, teachersTable.name)
      .orderBy(sql`SUM(CASE WHEN ${teachersTable.compensationType} = 'manual' THEN ${teacherMonthlyHoursTable.manualCost} ELSE ${teacherMonthlyHoursTable.hoursWorked} * ${teachersTable.hourlyRate} END) DESC`),
    db.select({
        customerId: paymentsTable.customerId,
        customerName: customersTable.fullName,
        count: sql<number>`COUNT(*)::int`,
        totalSpent: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)::int`,
      })
      .from(paymentsTable)
      .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
      .groupBy(paymentsTable.customerId, customersTable.fullName)
      .orderBy(sql`SUM(${paymentsTable.amount}) DESC`)
      .limit(10),
  ]);

  const totalRevenueAll = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalTeacherCostsAll = monthlyData.reduce((sum, m) => sum + m.teacherCosts, 0);
  const totalOtherCostsAll = monthlyData.reduce((sum, m) => sum + m.otherCosts, 0);
  const totalTaxesAll = monthlyData.reduce((sum, m) => sum + m.estimatedTaxes, 0);
  const totalNetProfitAll = totalRevenueAll - totalTeacherCostsAll - totalOtherCostsAll - totalTaxesAll;

  const teacherProfitability = teacherStats.map((t: any) => {
    const costShare = totalTeacherCostsAll > 0 ? t.totalCost / totalTeacherCostsAll : 0;
    const attributedRevenue = Math.round(totalRevenueAll * costShare);
    const profit = Math.round(totalNetProfitAll * costShare);
    return { ...t, attributedRevenue, profit };
  }).sort((a: any, b: any) => b.profit - a.profit);

  res.json({
    monthlyData,
    productStats,
    paymentMethodStats,
    teacherStats: teacherProfitability,
    topCustomers,
  });
});

router.get("/summary/history", async (_req, res): Promise<void> => {
  const summaries = await computeAllSummaries();
  summaries.reverse(); // DESC order for history
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

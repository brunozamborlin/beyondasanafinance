import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, teachersTable, teacherMonthlyHoursTable, paymentsTable } from "@workspace/db";
import {
  ListTeachersResponse,
  CreateTeacherBody,
  UpdateTeacherParams,
  UpdateTeacherBody,
  UpdateTeacherResponse,
  GetTeacherHoursParams,
  GetTeacherHoursQueryParams,
  GetTeacherHoursResponse,
  UpsertTeacherHoursParams,
  UpsertTeacherHoursBody,
  UpsertTeacherHoursResponse,
  GetTeacherAnalysisParams,
  GetTeacherAnalysisResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/teachers", async (_req, res): Promise<void> => {
  const teachers = await db
    .select()
    .from(teachersTable)
    .orderBy(teachersTable.name);

  res.json(ListTeachersResponse.parse(teachers));
});

router.post("/teachers", async (req, res): Promise<void> => {
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [teacher] = await db
    .insert(teachersTable)
    .values({
      ...parsed.data,
      active: parsed.data.active ?? true,
    })
    .returning();

  res.status(201).json(UpdateTeacherResponse.parse(teacher));
});

router.put("/teachers/:id", async (req, res): Promise<void> => {
  const params = UpdateTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [teacher] = await db
    .update(teachersTable)
    .set(parsed.data)
    .where(eq(teachersTable.id, params.data.id))
    .returning();

  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  res.json(UpdateTeacherResponse.parse(teacher));
});

router.get("/teachers/:id/hours", async (req, res): Promise<void> => {
  const params = GetTeacherHoursParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetTeacherHoursQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const [hours] = await db
    .select()
    .from(teacherMonthlyHoursTable)
    .where(
      and(
        eq(teacherMonthlyHoursTable.teacherId, params.data.id),
        eq(teacherMonthlyHoursTable.month, query.data.month)
      )
    );

  if (!hours) {
    res.json(
      GetTeacherHoursResponse.parse({
        id: 0,
        teacherId: params.data.id,
        month: query.data.month,
        hoursWorked: 0,
        manualCost: null,
      })
    );
    return;
  }

  res.json(
    GetTeacherHoursResponse.parse({
      ...hours,
      hoursWorked: Number(hours.hoursWorked),
    })
  );
});

router.put("/teachers/:id/hours", async (req, res): Promise<void> => {
  const params = UpsertTeacherHoursParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpsertTeacherHoursBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(teacherMonthlyHoursTable)
    .where(
      and(
        eq(teacherMonthlyHoursTable.teacherId, params.data.id),
        eq(teacherMonthlyHoursTable.month, parsed.data.month)
      )
    );

  let result;
  if (existing.length > 0) {
    [result] = await db
      .update(teacherMonthlyHoursTable)
      .set({
        hoursWorked: String(parsed.data.hoursWorked),
        manualCost: parsed.data.manualCost,
      })
      .where(eq(teacherMonthlyHoursTable.id, existing[0].id))
      .returning();
  } else {
    [result] = await db
      .insert(teacherMonthlyHoursTable)
      .values({
        teacherId: params.data.id,
        month: parsed.data.month,
        hoursWorked: String(parsed.data.hoursWorked),
        manualCost: parsed.data.manualCost,
      })
      .returning();
  }

  res.json(
    UpsertTeacherHoursResponse.parse({
      ...result,
      hoursWorked: Number(result.hoursWorked),
    })
  );
});

router.get("/teachers/analysis/:month", async (req, res): Promise<void> => {
  const params = GetTeacherAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const month = params.data.month;

  const revenueResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)` })
    .from(paymentsTable)
    .where(sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') = ${month}`);

  const totalRevenue = Number(revenueResult[0]?.total ?? 0);

  const teachers = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.active, true));

  const hoursRecords = await db
    .select()
    .from(teacherMonthlyHoursTable)
    .where(eq(teacherMonthlyHoursTable.month, month));

  const hoursMap = new Map(hoursRecords.map((h) => [h.teacherId, h]));

  let totalHours = 0;
  for (const h of hoursRecords) {
    totalHours += Number(h.hoursWorked);
  }

  const avgHourlyValue = totalHours > 0 ? Math.round(totalRevenue / totalHours) : 0;

  const analysis = teachers.map((teacher) => {
    const hourRecord = hoursMap.get(teacher.id);
    const hoursWorked = hourRecord ? Number(hourRecord.hoursWorked) : 0;

    let totalCost: number;
    if (teacher.compensationType === "manual") {
      totalCost = hourRecord?.manualCost ?? 0;
    } else {
      totalCost = Math.round(hoursWorked * (teacher.hourlyRate ?? 0));
    }

    const estimatedRevenue = Math.round(avgHourlyValue * hoursWorked);
    const estimatedMargin = estimatedRevenue - totalCost;

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      hoursWorked,
      totalCost,
      avgHourlyValue,
      estimatedRevenue,
      estimatedMargin,
    };
  });

  res.json(GetTeacherAnalysisResponse.parse(analysis));
});

export default router;

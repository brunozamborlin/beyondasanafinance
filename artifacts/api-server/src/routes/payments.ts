import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, paymentsTable, customersTable, productsTable } from "@workspace/db";
import {
  ListPaymentsQueryParams,
  ListPaymentsResponse,
  CreatePaymentBody,
  GetPaymentParams,
  GetPaymentResponse,
  UpdatePaymentParams,
  UpdatePaymentBody,
  UpdatePaymentResponse,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const paymentSelect = {
  id: paymentsTable.id,
  customerId: paymentsTable.customerId,
  productId: paymentsTable.productId,
  amount: paymentsTable.amount,
  paymentMethod: paymentsTable.paymentMethod,
  date: paymentsTable.date,
  note: paymentsTable.note,
  createdAt: paymentsTable.createdAt,
  updatedAt: paymentsTable.updatedAt,
  customerName: customersTable.fullName,
  productName: productsTable.name,
};

function serializePayment(p: any) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

router.get("/payments", async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  const month = query.success ? query.data.month : undefined;

  let whereClause;
  if (month) {
    whereClause = sql`to_char(${paymentsTable.date}::date, 'YYYY-MM') = ${month}`;
  }

  const results = await db
    .select(paymentSelect)
    .from(paymentsTable)
    .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
    .where(whereClause)
    .orderBy(sql`${paymentsTable.date} DESC`);

  res.json(ListPaymentsResponse.parse(results.map(serializePayment)));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values(parsed.data)
    .returning();

  const [full] = await db
    .select(paymentSelect)
    .from(paymentsTable)
    .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
    .where(eq(paymentsTable.id, payment.id));

  res.status(201).json(GetPaymentResponse.parse(serializePayment(full)));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db
    .select(paymentSelect)
    .from(paymentsTable)
    .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
    .where(eq(paymentsTable.id, params.data.id));

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(GetPaymentResponse.parse(serializePayment(payment)));
});

router.put("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(paymentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(paymentsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const [full] = await db
    .select(paymentSelect)
    .from(paymentsTable)
    .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
    .where(eq(paymentsTable.id, updated.id));

  res.json(UpdatePaymentResponse.parse(serializePayment(full)));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(paymentsTable)
    .where(eq(paymentsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

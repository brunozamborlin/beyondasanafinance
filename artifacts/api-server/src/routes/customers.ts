import { Router, type IRouter } from "express";
import { eq, ilike, desc, ne, sql } from "drizzle-orm";
import { db, customersTable, paymentsTable, productsTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  ListCustomerStatusesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let results;
  if (search) {
    results = await db
      .select()
      .from(customersTable)
      .where(ilike(customersTable.fullName, `%${search}%`))
      .orderBy(customersTable.fullName);
  } else {
    results = await db
      .select()
      .from(customersTable)
      .orderBy(customersTable.fullName);
  }

  const mapped = results.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  res.json(ListCustomersResponse.parse(mapped));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db
    .insert(customersTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(GetCustomerResponse.parse({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  }));
});

router.get("/customers/status", async (_req, res): Promise<void> => {
  // For each customer, find the last payment with a non-"other" product
  const results = await db
    .select({
      customerId: customersTable.id,
      productName: productsTable.name,
      productType: productsTable.type,
      durationMonths: productsTable.durationMonths,
      paymentDate: paymentsTable.date,
    })
    .from(customersTable)
    .leftJoin(
      paymentsTable,
      eq(paymentsTable.customerId, customersTable.id)
    )
    .leftJoin(
      productsTable,
      eq(productsTable.id, paymentsTable.productId)
    )
    .orderBy(customersTable.id, desc(paymentsTable.date));

  // Group by customer and pick last relevant payment
  const statusMap = new Map<number, {
    customerId: number;
    lastProduct: string | null;
    purchaseDate: string | null;
    expiresAt: string | null;
    status: string;
  }>();

  for (const row of results) {
    // Already found a relevant (non-other) payment for this customer
    if (statusMap.has(row.customerId)) continue;

    // Skip "other" type products — don't set status yet, keep looking
    if (!row.productType || row.productType === "other") continue;

    if (row.productType === "subscription" && row.durationMonths && row.paymentDate) {
      const purchaseDate = new Date(row.paymentDate);
      const expiresAt = new Date(purchaseDate);
      expiresAt.setMonth(expiresAt.getMonth() + row.durationMonths);
      const now = new Date();

      statusMap.set(row.customerId, {
        customerId: row.customerId,
        lastProduct: row.productName,
        purchaseDate: row.paymentDate,
        expiresAt: expiresAt.toISOString().split("T")[0],
        status: expiresAt > now ? "active" : "expired",
      });
    } else if (row.productType === "classpack" && row.paymentDate) {
      statusMap.set(row.customerId, {
        customerId: row.customerId,
        lastProduct: row.productName,
        purchaseDate: row.paymentDate,
        expiresAt: null,
        status: "classpack",
      });
    }
  }

  // Ensure all customers are in the map
  const allCustomers = await db.select({ id: customersTable.id }).from(customersTable);
  for (const c of allCustomers) {
    if (!statusMap.has(c.id)) {
      statusMap.set(c.id, {
        customerId: c.id,
        lastProduct: null,
        purchaseDate: null,
        expiresAt: null,
        status: "none",
      });
    }
  }

  res.json(ListCustomerStatusesResponse.parse(Array.from(statusMap.values())));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(GetCustomerResponse.parse({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  }));
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db
    .update(customersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(UpdateCustomerResponse.parse({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  }));
});

// Merge: reassign all payments from sourceId to targetId, then delete source
router.post("/customers/merge", async (req, res): Promise<void> => {
  const { sourceId, targetId } = req.body ?? {};

  if (!sourceId || !targetId || sourceId === targetId) {
    res.status(400).json({ error: "sourceId and targetId are required and must differ" });
    return;
  }

  const [source] = await db.select().from(customersTable).where(eq(customersTable.id, sourceId));
  const [target] = await db.select().from(customersTable).where(eq(customersTable.id, targetId));

  if (!source || !target) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  // Reassign all payments from source to target
  await db
    .update(paymentsTable)
    .set({ customerId: targetId })
    .where(eq(paymentsTable.customerId, sourceId));

  // Delete the source customer
  await db.delete(customersTable).where(eq(customersTable.id, sourceId));

  res.json({ merged: true, targetId, deletedId: sourceId });
});

export default router;

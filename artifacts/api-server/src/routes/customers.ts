import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, customersTable, paymentsTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
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

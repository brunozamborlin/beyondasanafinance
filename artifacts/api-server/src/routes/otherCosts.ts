import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, otherCostsTable } from "@workspace/db";
import {
  ListOtherCostsQueryParams,
  ListOtherCostsResponse,
  CreateOtherCostBody,
  UpdateOtherCostParams,
  UpdateOtherCostBody,
  UpdateOtherCostResponse,
  DeleteOtherCostParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/other-costs", async (req, res): Promise<void> => {
  const query = ListOtherCostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const costs = await db
    .select()
    .from(otherCostsTable)
    .where(eq(otherCostsTable.month, query.data.month));

  res.json(ListOtherCostsResponse.parse(costs));
});

router.post("/other-costs", async (req, res): Promise<void> => {
  const parsed = CreateOtherCostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cost] = await db
    .insert(otherCostsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(UpdateOtherCostResponse.parse(cost));
});

router.put("/other-costs/:id", async (req, res): Promise<void> => {
  const params = UpdateOtherCostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOtherCostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cost] = await db
    .update(otherCostsTable)
    .set(parsed.data)
    .where(eq(otherCostsTable.id, params.data.id))
    .returning();

  if (!cost) {
    res.status(404).json({ error: "Cost not found" });
    return;
  }

  res.json(UpdateOtherCostResponse.parse(cost));
});

router.delete("/other-costs/:id", async (req, res): Promise<void> => {
  const params = DeleteOtherCostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(otherCostsTable)
    .where(eq(otherCostsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Cost not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

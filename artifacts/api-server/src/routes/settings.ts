import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, taxSettingsTable } from "@workspace/db";
import {
  GetTaxSettingsResponse,
  UpdateTaxSettingsBody,
  UpdateTaxSettingsResponse,
  GetDefaultCostsResponse,
  UpdateDefaultCostsBody,
  UpdateDefaultCostsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

let defaultCosts = [
  { category: "Affitto", amount: 0 },
  { category: "Bollette", amount: 0 },
  { category: "Studio", amount: 0 },
  { category: "Altre spese", amount: 0 },
];

router.get("/settings/tax", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(taxSettingsTable).limit(1);

  if (!settings) {
    [settings] = await db
      .insert(taxSettingsTable)
      .values({ taxRate: "22" })
      .returning();
  }

  res.json(
    GetTaxSettingsResponse.parse({
      id: settings.id,
      taxRate: Number(settings.taxRate),
    })
  );
});

router.put("/settings/tax", async (req, res): Promise<void> => {
  const parsed = UpdateTaxSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [existing] = await db.select().from(taxSettingsTable).limit(1);

  let settings;
  if (existing) {
    [settings] = await db
      .update(taxSettingsTable)
      .set({ taxRate: String(parsed.data.taxRate) })
      .where(eq(taxSettingsTable.id, existing.id))
      .returning();
  } else {
    [settings] = await db
      .insert(taxSettingsTable)
      .values({ taxRate: String(parsed.data.taxRate) })
      .returning();
  }

  res.json(
    UpdateTaxSettingsResponse.parse({
      id: settings.id,
      taxRate: Number(settings.taxRate),
    })
  );
});

router.get("/settings/default-costs", (_req, res): void => {
  res.json(GetDefaultCostsResponse.parse(defaultCosts));
});

router.put("/settings/default-costs", (req, res): void => {
  const parsed = UpdateDefaultCostsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  defaultCosts = parsed.data;
  res.json(UpdateDefaultCostsResponse.parse(defaultCosts));
});

export default router;

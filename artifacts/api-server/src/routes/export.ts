import { Router, type IRouter } from "express";
import { sql, eq, desc } from "drizzle-orm";
import { db, paymentsTable, customersTable, productsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/payments/export", async (req, res): Promise<void> => {
  const payments = await db
    .select({
      date: paymentsTable.date,
      customerName: customersTable.fullName,
      productName: productsTable.name,
      amount: paymentsTable.amount,
      paymentMethod: paymentsTable.paymentMethod,
      note: paymentsTable.note,
    })
    .from(paymentsTable)
    .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .innerJoin(productsTable, eq(paymentsTable.productId, productsTable.id))
    .orderBy(desc(paymentsTable.date));

  const BOM = "\uFEFF";
  const SEP = ";";
  const header = ["Data", "Cliente", "Prodotto", "Importo (€)", "Metodo", "Note"].join(SEP);

  const rows = payments.map((p) => {
    const date = String(p.date).slice(0, 10);
    const amount = (Number(p.amount) / 100).toFixed(2).replace(".", ",");
    const method = p.paymentMethod ?? "";
    const note = (p.note ?? "").replace(/[;\n\r]/g, " ");
    const customer = (p.customerName ?? "").replace(/;/g, " ");
    const product = (p.productName ?? "").replace(/;/g, " ");
    return [date, customer, product, amount, method, note].join(SEP);
  });

  const csv = BOM + header + "\n" + rows.join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=pagamenti.csv");
  res.send(csv);
});

export default router;

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { db, pool, customersTable, productsTable, paymentsTable, taxSettingsTable } from "@workspace/db";

const PRODUCTS = [
  { name: "Iscrizione", defaultPrice: 3000, sortOrder: 0 },
  { name: "3 Mesi", defaultPrice: 27000, sortOrder: 1 },
  { name: "10 Ore", defaultPrice: 15000, sortOrder: 2 },
  { name: "25 Ore", defaultPrice: 30000, sortOrder: 3 },
  { name: "5 Ore", defaultPrice: 8000, sortOrder: 4 },
];

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function parseDate(dateStr: string): string | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAmount(contanti: string, pos: string, note: string): { amount: number; method: string } | null {
  const cashVal = contanti ? parseFloat(contanti.replace(",", ".")) : 0;
  const posVal = pos ? parseFloat(pos.replace(",", ".")) : 0;

  if (note && note.toLowerCase() === "bonifico") {
    const val = cashVal > 0 ? cashVal : posVal;
    if (val > 0) return { amount: Math.round(val * 100), method: "bonifico" };
  }

  if (cashVal > 0) {
    return { amount: Math.round(cashVal * 100), method: "contanti" };
  }
  if (posVal > 0) {
    return { amount: Math.round(posVal * 100), method: "pos" };
  }
  return null;
}

async function main() {
  console.log("Seeding database...");

  const zipPath = path.resolve(new URL("../../attached_assets/data_1774386792941.zip", import.meta.url).pathname);
  if (!fs.existsSync(zipPath)) {
    console.error("Zip file not found:", zipPath);
    process.exit(1);
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const productMap = new Map<string, number>();
  for (const p of PRODUCTS) {
    const [inserted] = await db
      .insert(productsTable)
      .values({ name: p.name, defaultPrice: p.defaultPrice, sortOrder: p.sortOrder, active: true })
      .onConflictDoNothing()
      .returning();
    if (inserted) {
      productMap.set(p.name.toLowerCase(), inserted.id);
      console.log(`  Product: ${p.name} (${inserted.id})`);
    }
  }

  if (productMap.size === 0) {
    const existing = await db.select().from(productsTable);
    for (const p of existing) {
      productMap.set(p.name.toLowerCase(), p.id);
    }
  }

  const [existingTax] = await db.select().from(taxSettingsTable).limit(1);
  if (!existingTax) {
    await db.insert(taxSettingsTable).values({ taxRate: "22" });
    console.log("  Tax settings: 22%");
  }

  const customerMap = new Map<string, number>();

  const csvEntries = entries.filter(
    (e) => e.entryName.endsWith(".csv") && !e.entryName.startsWith("__MACOSX")
  );

  let totalPayments = 0;
  let skipped = 0;

  for (const entry of csvEntries) {
    console.log(`  Processing: ${entry.entryName}`);
    const content = entry.getData().toString("utf8");
    const rows = parseCSV(content);

    for (const row of rows) {
      const name = (row["Nome_Cognome"] || row["Cliente"])?.trim();
      const dateStr = row["Data"]?.trim();
      const productName = row["Abbonamento"]?.trim();
      const contanti = row["Contanti"]?.trim();
      const pos = row["POS"]?.trim();
      const note = row["Note"]?.trim() || null;

      if (!name || !dateStr || !productName) {
        skipped++;
        continue;
      }

      const date = parseDate(dateStr);
      if (!date) {
        skipped++;
        continue;
      }

      const amountInfo = parseAmount(contanti, pos, note || "");
      if (!amountInfo) {
        skipped++;
        continue;
      }

      if (!customerMap.has(name.toLowerCase())) {
        const [customer] = await db
          .insert(customersTable)
          .values({ fullName: name })
          .returning();
        customerMap.set(name.toLowerCase(), customer.id);
      }
      const customerId = customerMap.get(name.toLowerCase())!;

      const normalizedProduct = productName.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim();
      let productId = productMap.get(normalizedProduct);

      if (!productId) {
        for (const [key, id] of productMap.entries()) {
          if (normalizedProduct.includes(key) || key.includes(normalizedProduct)) {
            productId = id;
            break;
          }
        }
      }

      if (!productId) {
        const [newProduct] = await db
          .insert(productsTable)
          .values({
            name: productName,
            defaultPrice: amountInfo.amount,
            sortOrder: productMap.size,
            active: true,
          })
          .returning();
        productId = newProduct.id;
        productMap.set(productName.toLowerCase(), productId);
        console.log(`    New product created: ${productName}`);
      }

      await db.insert(paymentsTable).values({
        customerId,
        productId,
        amount: amountInfo.amount,
        paymentMethod: amountInfo.method,
        date,
        note,
      });

      totalPayments++;
    }
  }

  console.log(`\nSeed complete!`);
  console.log(`  Customers: ${customerMap.size}`);
  console.log(`  Products: ${productMap.size}`);
  console.log(`  Payments: ${totalPayments}`);
  console.log(`  Skipped rows: ${skipped}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

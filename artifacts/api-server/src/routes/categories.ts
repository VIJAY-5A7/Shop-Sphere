import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { CreateCategoryBody } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      image: categoriesTable.image,
      parentId: categoriesTable.parentId,
      productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE products.category_id = categories.id)`,
    })
    .from(categoriesTable)
    .orderBy(categoriesTable.name);

  res.json(rows.map(r => ({
    ...r,
    image: r.image ?? null,
    parentId: r.parentId ?? null,
    productCount: Number(r.productCount),
  })));
});

router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json({
    ...cat,
    image: cat.image ?? null,
    parentId: cat.parentId ?? null,
    productCount: 0,
  });
});

export default router;

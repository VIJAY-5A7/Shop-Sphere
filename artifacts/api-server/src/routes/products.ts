import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql, desc, asc, ilike } from "drizzle-orm";
import { db, productsTable, categoriesTable, usersTable, reviewsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function buildProductResponse(p: any, sellerName: string, categoryName: string, avgRating: number, reviewCount: number) {
  const price = parseFloat(p.price);
  const discount = parseFloat(p.discountPercent ?? "0");
  const finalPrice = price * (1 - discount / 100);
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    images: p.images ?? [],
    categoryId: p.categoryId,
    categoryName,
    brand: p.brand,
    price,
    discountPercent: discount,
    finalPrice: Math.round(finalPrice * 100) / 100,
    stock: p.stock,
    sellerId: p.sellerId,
    sellerName,
    avgRating,
    reviewCount,
    variants: p.variants ?? [],
    isFeatured: p.isFeatured,
    isFlashSale: p.isFlashSale,
    flashSaleEnd: p.flashSaleEnd ? p.flashSaleEnd.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, brand, minPrice, maxPrice, minRating, inStock, search, sort, page = 1, limit = 20 } = parsed.data;

  const conditions: any[] = [];
  if (brand) conditions.push(ilike(productsTable.brand, `%${brand}%`));
  if (inStock) conditions.push(gte(productsTable.stock, 1));
  if (search) conditions.push(ilike(productsTable.title, `%${search}%`));

  // Join with category to filter by slug or name
  const allProducts = await db
    .select({
      product: productsTable,
      category: categoriesTable,
      seller: usersTable,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sort === "price_asc" ? asc(productsTable.price) : sort === "price_desc" ? desc(productsTable.price) : sort === "newest" ? desc(productsTable.createdAt) : desc(productsTable.isFeatured));

  // Get ratings for all products
  const reviewAggs = await db
    .select({
      productId: reviewsTable.productId,
      avgRating: sql<number>`AVG(${reviewsTable.rating})`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(reviewsTable)
    .groupBy(reviewsTable.productId);

  const ratingMap = new Map(reviewAggs.map(r => [r.productId, { avgRating: Number(r.avgRating) || 0, reviewCount: Number(r.reviewCount) || 0 }]));

  let filtered = allProducts.filter(row => {
    const price = parseFloat(row.product.price);
    const discount = parseFloat(row.product.discountPercent ?? "0");
    const finalPrice = price * (1 - discount / 100);
    if (category && row.category?.slug !== category && row.category?.name !== category) return false;
    if (minPrice != null && finalPrice < minPrice) return false;
    if (maxPrice != null && finalPrice > maxPrice) return false;
    if (minRating != null) {
      const r = ratingMap.get(row.product.id);
      if (!r || r.avgRating < minRating) return false;
    }
    return true;
  });

  const total = filtered.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const totalPages = Math.ceil(total / limitNum);
  const sliced = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const products = sliced.map(row => {
    const r = ratingMap.get(row.product.id) ?? { avgRating: 0, reviewCount: 0 };
    return buildProductResponse(row.product, row.seller?.name ?? "Unknown Seller", row.category?.name ?? "Uncategorized", r.avgRating, r.reviewCount);
  });

  res.json({ products, total, page: pageNum, totalPages });
});

router.get("/products/featured", async (req, res): Promise<void> => {
  const rows = await db
    .select({ product: productsTable, category: categoriesTable, seller: usersTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(eq(productsTable.isFeatured, true))
    .limit(12);

  const reviewAggs = await db
    .select({ productId: reviewsTable.productId, avgRating: sql<number>`AVG(${reviewsTable.rating})`, reviewCount: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .groupBy(reviewsTable.productId);
  const ratingMap = new Map(reviewAggs.map(r => [r.productId, { avgRating: Number(r.avgRating) || 0, reviewCount: Number(r.reviewCount) || 0 }]));

  res.json(rows.map(row => {
    const r = ratingMap.get(row.product.id) ?? { avgRating: 0, reviewCount: 0 };
    return buildProductResponse(row.product, row.seller?.name ?? "Unknown", row.category?.name ?? "Uncategorized", r.avgRating, r.reviewCount);
  }));
});

router.get("/products/flash-sale", async (req, res): Promise<void> => {
  const rows = await db
    .select({ product: productsTable, category: categoriesTable, seller: usersTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(eq(productsTable.isFlashSale, true))
    .limit(8);

  const reviewAggs = await db
    .select({ productId: reviewsTable.productId, avgRating: sql<number>`AVG(${reviewsTable.rating})`, reviewCount: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .groupBy(reviewsTable.productId);
  const ratingMap = new Map(reviewAggs.map(r => [r.productId, { avgRating: Number(r.avgRating) || 0, reviewCount: Number(r.reviewCount) || 0 }]));

  const products = rows.map(row => {
    const r = ratingMap.get(row.product.id) ?? { avgRating: 0, reviewCount: 0 };
    return buildProductResponse(row.product, row.seller?.name ?? "Unknown", row.category?.name ?? "Uncategorized", r.avgRating, r.reviewCount);
  });

  const endsAt = rows[0]?.product.flashSaleEnd?.toISOString() ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  res.json({ endsAt, products });
});

router.get("/products/:productId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [row] = await db
    .select({ product: productsTable, category: categoriesTable, seller: usersTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(eq(productsTable.id, productId));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [agg] = await db
    .select({ avgRating: sql<number>`AVG(${reviewsTable.rating})`, reviewCount: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, productId));

  const avgRating = Number(agg?.avgRating) || 0;
  const reviewCount = Number(agg?.reviewCount) || 0;

  res.json(buildProductResponse(row.product, row.seller?.name ?? "Unknown", row.category?.name ?? "Uncategorized", avgRating, reviewCount));
});

router.post("/products", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [seller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!seller) { res.status(404).json({ error: "User not found" }); return; }

  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const slug = parsed.data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    slug,
    sellerId: seller.id,
    price: String(parsed.data.price),
    discountPercent: String(parsed.data.discountPercent ?? 0),
    variants: parsed.data.variants ?? [],
    flashSaleEnd: parsed.data.flashSaleEnd ? new Date(parsed.data.flashSaleEnd) : null,
  }).returning();

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
  res.status(201).json(buildProductResponse(product, seller.name, cat?.name ?? "Uncategorized", 0, 0));
});

router.put("/products/:productId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: any = { ...parsed.data };
  if (parsed.data.price != null) updateData.price = String(parsed.data.price);
  if (parsed.data.discountPercent != null) updateData.discountPercent = String(parsed.data.discountPercent);
  if (parsed.data.flashSaleEnd != null) updateData.flashSaleEnd = new Date(parsed.data.flashSaleEnd);

  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, productId)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, product.sellerId));
  const [agg] = await db.select({ avgRating: sql<number>`AVG(${reviewsTable.rating})`, reviewCount: sql<number>`COUNT(*)` })
    .from(reviewsTable).where(eq(reviewsTable.productId, productId));

  res.json(buildProductResponse(product, seller?.name ?? "Unknown", cat?.name ?? "Uncategorized", Number(agg?.avgRating) || 0, Number(agg?.reviewCount) || 0));
});

router.delete("/products/:productId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }

  await db.delete(productsTable).where(eq(productsTable.id, productId));
  res.sendStatus(204);
});

export default router;

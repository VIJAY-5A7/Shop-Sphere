import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, wishlistItemsTable, productsTable, usersTable, reviewsTable } from "@workspace/db";
import { AddToWishlistBody, RemoveFromWishlistParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

router.get("/wishlist", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.json([]); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.json([]); return; }

  const rows = await db
    .select({ item: wishlistItemsTable, product: productsTable })
    .from(wishlistItemsTable)
    .leftJoin(productsTable, eq(wishlistItemsTable.productId, productsTable.id))
    .where(eq(wishlistItemsTable.userId, userId));

  const productIds = rows.map(r => r.product?.id).filter(Boolean) as number[];
  const reviewAggs = productIds.length > 0 ? await db
    .select({ productId: reviewsTable.productId, avgRating: sql<number>`AVG(${reviewsTable.rating})` })
    .from(reviewsTable)
    .where(sql`${reviewsTable.productId} = ANY(${productIds}::int[])`)
    .groupBy(reviewsTable.productId) : [];
  const ratingMap = new Map(reviewAggs.map(r => [r.productId, Number(r.avgRating) || 0]));

  res.json(rows.filter(r => r.product).map(r => {
    const price = parseFloat(r.product!.price);
    const discount = parseFloat(r.product!.discountPercent ?? "0");
    return {
      id: r.item.id,
      productId: r.item.productId,
      productTitle: r.product!.title,
      productImage: r.product!.images?.[0] ?? "",
      productPrice: price,
      finalPrice: Math.round(price * (1 - discount / 100) * 100) / 100,
      discountPercent: discount,
      inStock: r.product!.stock > 0,
      avgRating: ratingMap.get(r.item.productId) ?? 0,
      addedAt: r.item.createdAt.toISOString(),
    };
  }));
});

router.post("/wishlist", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const parsed = AddToWishlistBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { productId } = parsed.data;
  const [existing] = await db.select().from(wishlistItemsTable)
    .where(and(eq(wishlistItemsTable.userId, userId), eq(wishlistItemsTable.productId, productId)));

  if (existing) { res.json(existing); return; }

  const [item] = await db.insert(wishlistItemsTable).values({ userId, productId }).returning();
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  const price = parseFloat(product?.price ?? "0");
  const discount = parseFloat(product?.discountPercent ?? "0");

  res.json({
    id: item.id,
    productId: item.productId,
    productTitle: product?.title ?? "",
    productImage: product?.images?.[0] ?? "",
    productPrice: price,
    finalPrice: Math.round(price * (1 - discount / 100) * 100) / 100,
    discountPercent: discount,
    inStock: (product?.stock ?? 0) > 0,
    avgRating: 0,
    addedAt: item.createdAt.toISOString(),
  });
});

router.delete("/wishlist/:productId", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);
  await db.delete(wishlistItemsTable).where(and(eq(wishlistItemsTable.userId, userId), eq(wishlistItemsTable.productId, productId)));
  res.sendStatus(204);
});

export default router;

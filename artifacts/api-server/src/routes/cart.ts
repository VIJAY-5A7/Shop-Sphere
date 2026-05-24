import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cartItemsTable, productsTable, usersTable } from "@workspace/db";
import { AddToCartBody, UpdateCartItemParams, RemoveCartItemParams } from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

async function buildCart(userId: number) {
  const items = await db
    .select({ item: cartItemsTable, product: productsTable })
    .from(cartItemsTable)
    .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.userId, userId));

  const cartItems = items.filter(i => i.product).map(i => {
    const price = parseFloat(i.product!.price);
    const discount = parseFloat(i.product!.discountPercent ?? "0");
    const finalPrice = Math.round(price * (1 - discount / 100) * 100) / 100;
    return {
      id: i.item.id,
      productId: i.item.productId,
      productTitle: i.product!.title,
      productImage: i.product!.images?.[0] ?? "",
      productPrice: price,
      finalPrice,
      discountPercent: discount,
      variant: i.item.variant ?? null,
      quantity: i.item.quantity,
      stock: i.product!.stock,
    };
  });

  const subtotal = cartItems.reduce((s, i) => s + i.productPrice * i.quantity, 0);
  const discountAmount = cartItems.reduce((s, i) => s + (i.productPrice - i.finalPrice) * i.quantity, 0);
  const total = cartItems.reduce((s, i) => s + i.finalPrice * i.quantity, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return {
    items: cartItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount,
  };
}

router.get("/cart", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.json({ items: [], subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.json({ items: [], subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 }); return; }
  res.json(await buildCart(userId));
});

router.post("/cart", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { productId, quantity, variant } = parsed.data;

  const [existing] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)));

  if (existing) {
    await db.update(cartItemsTable).set({ quantity: existing.quantity + quantity }).where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ userId, productId, quantity, variant: variant ?? null });
  }
  res.json(await buildCart(userId));
});

router.put("/cart/:itemId", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const itemId = parseInt(raw, 10);

  const parsed = z.object({ quantity: z.number().int().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await db.update(cartItemsTable).set({ quantity: parsed.data.quantity })
    .where(and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.userId, userId)));
  res.json(await buildCart(userId));
});

router.delete("/cart/:itemId", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const itemId = parseInt(raw, 10);
  await db.delete(cartItemsTable).where(and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.userId, userId)));
  res.json(await buildCart(userId));
});

router.delete("/cart", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
  res.sendStatus(204);
});

export default router;

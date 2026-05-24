import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, usersTable, addressesTable, couponsTable } from "@workspace/db";
import {
  CreateOrderBody,
  GetOrderParams,
  CancelOrderBody,
  CancelOrderParams,
  ReturnOrderParams,
  ReturnOrderBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

function formatOrder(order: any, items: any[], address: any) {
  return {
    id: order.id,
    userId: order.userId,
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      productTitle: i.productTitle,
      productImage: i.productImage,
      variant: i.variant ?? null,
      quantity: i.quantity,
      price: parseFloat(i.price),
    })),
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: parseFloat(order.subtotal),
    discountAmount: parseFloat(order.discountAmount),
    gstAmount: parseFloat(order.gstAmount),
    shippingFee: parseFloat(order.shippingFee),
    total: parseFloat(order.total),
    couponCode: order.couponCode ?? null,
    trackingNumber: order.trackingNumber ?? null,
    estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
    timeline: order.timeline ?? [],
    shippingAddress: address ? {
      id: address.id,
      userId: address.userId,
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      isDefault: address.isDefault,
    } : null,
    createdAt: order.createdAt.toISOString(),
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.json({ orders: [], total: 0, page: 1, totalPages: 0 }); return; }

  const parsed = ListOrdersQueryParams.safeParse(req.query);
  const { page = 1, limit = 10 } = parsed.success ? parsed.data : {};

  const conditions: any[] = [eq(ordersTable.userId, userId)];
  const allOrders = await db.select().from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt));

  const total = allOrders.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const sliced = allOrders.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const orders = await Promise.all(sliced.map(async order => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const address = order.shippingAddressSnapshot as any;
    return formatOrder(order, items, address);
  }));

  res.json({ orders, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

router.post("/orders", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { addressId, paymentMethod, couponCode } = parsed.data;

  const [address] = await db.select().from(addressesTable).where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)));
  if (!address) { res.status(404).json({ error: "Address not found" }); return; }

  const cartRows = await db
    .select({ item: cartItemsTable, product: productsTable })
    .from(cartItemsTable)
    .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.userId, userId));

  if (!cartRows.length) { res.status(400).json({ error: "Cart is empty" }); return; }

  let discountAmount = 0;
  if (couponCode) {
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode));
    if (coupon && coupon.isActive) {
      const subtotalRaw = cartRows.reduce((s, r) => s + parseFloat(r.product?.price ?? "0") * r.item.quantity, 0);
      if (coupon.type === "percent") {
        discountAmount = subtotalRaw * (parseFloat(coupon.value) / 100);
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscount));
      } else {
        discountAmount = Math.min(parseFloat(coupon.value), subtotalRaw);
      }
      await db.update(couponsTable).set({ usedCount: (coupon.usedCount ?? 0) + 1 }).where(eq(couponsTable.id, coupon.id));
    }
  }

  const subtotal = cartRows.reduce((s, r) => {
    const price = parseFloat(r.product?.price ?? "0");
    const disc = parseFloat(r.product?.discountPercent ?? "0");
    return s + price * (1 - disc / 100) * r.item.quantity;
  }, 0);
  const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const shippingFee = subtotal > 499 ? 0 : 49;
  const total = Math.round((subtotal - discountAmount + gstAmount + shippingFee) * 100) / 100;

  const timeline = [{ status: "pending", message: "Order placed successfully", timestamp: new Date().toISOString() }];

  const [order] = await db.insert(ordersTable).values({
    userId,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
    subtotal: String(Math.round(subtotal * 100) / 100),
    discountAmount: String(Math.round(discountAmount * 100) / 100),
    gstAmount: String(gstAmount),
    shippingFee: String(shippingFee),
    total: String(total),
    couponCode: couponCode ?? null,
    shippingAddressSnapshot: address,
    timeline,
  }).returning();

  for (const row of cartRows) {
    if (!row.product) continue;
    const price = parseFloat(row.product.price);
    const disc = parseFloat(row.product.discountPercent ?? "0");
    const finalPrice = price * (1 - disc / 100);
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: row.product.id,
      productTitle: row.product.title,
      productImage: row.product.images?.[0] ?? "",
      variant: row.item.variant ?? null,
      quantity: row.item.quantity,
      price: String(Math.round(finalPrice * 100) / 100),
      sellerId: row.product.sellerId,
    });
    await db.update(productsTable).set({ stock: Math.max(0, row.product.stock - row.item.quantity) }).where(eq(productsTable.id, row.product.id));
  }

  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.status(201).json(formatOrder(order, items, address));
});

router.get("/orders/:orderId", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  res.json(formatOrder(order, items, order.shippingAddressSnapshot));
});

router.post("/orders/:orderId/cancel", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);

  const parsed = CancelOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const timeline = [...(order.timeline as any[]), { status: "cancelled", message: `Cancelled: ${parsed.data.reason}`, timestamp: new Date().toISOString() }];
  const [updated] = await db.update(ordersTable).set({ status: "cancelled", timeline }).where(eq(ordersTable.id, orderId)).returning();
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  res.json(formatOrder(updated, items, updated.shippingAddressSnapshot));
});

router.post("/orders/:orderId/return", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);

  const parsed = ReturnOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const timeline = [...(order.timeline as any[]), { status: "return_requested", message: `Return requested: ${parsed.data.reason}`, timestamp: new Date().toISOString() }];
  const [updated] = await db.update(ordersTable).set({ status: "return_requested", timeline }).where(eq(ordersTable.id, orderId)).returning();
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  res.json(formatOrder(updated, items, updated.shippingAddressSnapshot));
});

export default router;

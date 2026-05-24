import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, usersTable } from "@workspace/db";
import { ShipOrderBody, ShipOrderParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function getSellerFromClerk(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

function formatOrder(order: any, items: any[]) {
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
    shippingAddress: order.shippingAddressSnapshot ?? null,
    createdAt: order.createdAt.toISOString(),
  };
}

router.get("/seller/dashboard", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const seller = await getSellerFromClerk(clerkId);
  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }

  const products = await db.select().from(productsTable).where(eq(productsTable.sellerId, seller.id));
  const productIds = products.map(p => p.id);

  const allOrderItems = productIds.length > 0
    ? await db.select({ item: orderItemsTable, order: ordersTable })
        .from(orderItemsTable)
        .leftJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(sql`${orderItemsTable.sellerId} = ${seller.id}`)
    : [];

  const totalRevenue = allOrderItems.reduce((s, r) => {
    if (r.order?.status !== "cancelled") return s + parseFloat(r.item.price) * r.item.quantity;
    return s;
  }, 0);

  const orderIds = [...new Set(allOrderItems.map(r => r.order?.id).filter(Boolean))];
  const orders = allOrderItems.map(r => r.order).filter(Boolean);
  const uniqueOrders = [...new Map(orders.map(o => [o!.id, o!])).values()];
  const pendingOrders = uniqueOrders.filter(o => ["pending", "confirmed", "processing"].includes(o.status)).length;
  const returnedOrders = uniqueOrders.filter(o => ["return_requested", "returned"].includes(o.status)).length;
  const returnRate = uniqueOrders.length > 0 ? (returnedOrders / uniqueOrders.length) * 100 : 0;

  // Revenue chart: last 7 days
  const revenueChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayRevenue = allOrderItems.filter(r => {
      if (!r.order || r.order.status === "cancelled") return false;
      return r.order.createdAt.toISOString().split("T")[0] === dateStr;
    }).reduce((s, r) => s + parseFloat(r.item.price) * r.item.quantity, 0);
    const dayOrders = [...new Set(allOrderItems.filter(r => r.order?.createdAt.toISOString().split("T")[0] === dateStr).map(r => r.order?.id))].filter(Boolean).length;
    return { date: dateStr, revenue: Math.round(dayRevenue * 100) / 100, orders: dayOrders };
  });

  // Top products by revenue
  const productRevMap = new Map<number, { revenue: number; unitsSold: number }>();
  for (const r of allOrderItems) {
    if (!r.order || r.order.status === "cancelled") continue;
    const cur = productRevMap.get(r.item.productId) ?? { revenue: 0, unitsSold: 0 };
    productRevMap.set(r.item.productId, {
      revenue: cur.revenue + parseFloat(r.item.price) * r.item.quantity,
      unitsSold: cur.unitsSold + r.item.quantity,
    });
  }
  const topProducts = products
    .map(p => ({
      productId: p.id,
      title: p.title,
      image: p.images?.[0] ?? "",
      revenue: productRevMap.get(p.id)?.revenue ?? 0,
      unitsSold: productRevMap.get(p.id)?.unitsSold ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrderData = uniqueOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
  const recentOrders = await Promise.all(recentOrderData.map(async o => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
    return formatOrder(o, items);
  }));

  res.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: uniqueOrders.length,
    pendingOrders,
    totalProducts: products.length,
    returnRate: Math.round(returnRate * 100) / 100,
    revenueChart,
    topProducts,
    recentOrders,
  });
});

router.get("/seller/products", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const seller = await getSellerFromClerk(clerkId);
  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }

  const products = await db.select().from(productsTable).where(eq(productsTable.sellerId, seller.id));
  res.json(products.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    images: p.images ?? [],
    categoryId: p.categoryId,
    categoryName: "",
    brand: p.brand,
    price: parseFloat(p.price),
    discountPercent: parseFloat(p.discountPercent ?? "0"),
    finalPrice: Math.round(parseFloat(p.price) * (1 - parseFloat(p.discountPercent ?? "0") / 100) * 100) / 100,
    stock: p.stock,
    sellerId: p.sellerId,
    sellerName: seller.name,
    avgRating: 0,
    reviewCount: 0,
    variants: p.variants ?? [],
    isFeatured: p.isFeatured,
    isFlashSale: p.isFlashSale,
    flashSaleEnd: p.flashSaleEnd ? p.flashSaleEnd.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.get("/seller/orders", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const seller = await getSellerFromClerk(clerkId);
  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }

  const orderItemRows = await db
    .select({ item: orderItemsTable, order: ordersTable })
    .from(orderItemsTable)
    .leftJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(orderItemsTable.sellerId, seller.id))
    .orderBy(desc(ordersTable.createdAt));

  const uniqueOrderMap = new Map<number, { order: any; items: any[] }>();
  for (const row of orderItemRows) {
    if (!row.order) continue;
    if (!uniqueOrderMap.has(row.order.id)) {
      uniqueOrderMap.set(row.order.id, { order: row.order, items: [] });
    }
    uniqueOrderMap.get(row.order.id)!.items.push(row.item);
  }

  const orders = [...uniqueOrderMap.values()].map(({ order, items }) => formatOrder(order, items));
  res.json({ orders, total: orders.length, page: 1, totalPages: 1 });
});

router.post("/seller/orders/:orderId/ship", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);

  const parsed = ShipOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const timeline = [...(order.timeline as any[]), { status: "shipped", message: `Shipped via ${parsed.data.carrier}. Tracking: ${parsed.data.trackingNumber}`, timestamp: new Date().toISOString() }];
  const [updated] = await db.update(ordersTable).set({
    status: "shipped",
    trackingNumber: parsed.data.trackingNumber,
    estimatedDelivery: new Date(parsed.data.estimatedDelivery),
    timeline,
  }).where(eq(ordersTable.id, orderId)).returning();

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  res.json(formatOrder(updated, items));
});

export default router;

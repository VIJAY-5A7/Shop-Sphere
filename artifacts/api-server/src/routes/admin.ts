import { Router, type IRouter } from "express";
import { eq, desc, sql, ilike, and } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, categoriesTable } from "@workspace/db";
import { BanUserBody, BanUserParams, ListUsersQueryParams, ListAllOrdersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

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

router.get("/admin/dashboard", async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(usersTable);
  const [productCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(productsTable);

  const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  const totalRevenue = allOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + parseFloat(o.total), 0);
  const pendingOrders = allOrders.filter(o => ["pending", "confirmed", "processing"].includes(o.status)).length;

  const today = new Date().toISOString().split("T")[0];
  const newUsersToday = await db.select({ count: sql<number>`COUNT(*)` })
    .from(usersTable)
    .where(sql`DATE(${usersTable.createdAt}) = ${today}`);

  // Revenue chart: last 14 days
  const revenueChart = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = allOrders.filter(o => o.createdAt.toISOString().split("T")[0] === dateStr && o.status !== "cancelled");
    return {
      date: dateStr,
      revenue: Math.round(dayOrders.reduce((s, o) => s + parseFloat(o.total), 0) * 100) / 100,
      orders: dayOrders.length,
    };
  });

  // Category stats
  const allOrderItems = await db.select({ item: orderItemsTable, product: productsTable, category: categoriesTable })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id));

  const catMap = new Map<string, { revenue: number; orders: Set<number> }>();
  for (const row of allOrderItems) {
    const catName = row.category?.name ?? "Uncategorized";
    if (!catMap.has(catName)) catMap.set(catName, { revenue: 0, orders: new Set() });
    const entry = catMap.get(catName)!;
    entry.revenue += parseFloat(row.item.price) * row.item.quantity;
    entry.orders.add(row.item.orderId);
  }
  const categoryStats = [...catMap.entries()].map(([categoryName, data]) => ({
    categoryName,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders.size,
  })).sort((a, b) => b.revenue - a.revenue);

  // Top products
  const productRevMap = new Map<number, { title: string; image: string; revenue: number; unitsSold: number }>();
  for (const row of allOrderItems) {
    if (!row.product) continue;
    const cur = productRevMap.get(row.product.id) ?? { title: row.product.title, image: row.product.images?.[0] ?? "", revenue: 0, unitsSold: 0 };
    productRevMap.set(row.product.id, { ...cur, revenue: cur.revenue + parseFloat(row.item.price) * row.item.quantity, unitsSold: cur.unitsSold + row.item.quantity });
  }
  const topProducts = [...productRevMap.entries()]
    .map(([productId, data]) => ({ productId, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const recentOrderData = allOrders.slice(0, 5);
  const recentOrders = await Promise.all(recentOrderData.map(async o => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
    return formatOrder(o, items);
  }));

  res.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: allOrders.length,
    totalUsers: Number(userCount.count),
    totalProducts: Number(productCount.count),
    pendingOrders,
    newUsersToday: Number(newUsersToday[0]?.count ?? 0),
    revenueChart,
    categoryStats,
    topProducts,
    recentOrders,
  });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  const { role, search, page = 1 } = parsed.success ? parsed.data : { role: undefined, search: undefined, page: 1 };

  const conditions: any[] = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

  const users = await db.select().from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usersTable.createdAt));

  res.json(users.map(u => ({
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    role: u.role,
    isBanned: u.isBanned,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.post("/admin/users/:userId/ban", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  const parsed = BanUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.update(usersTable)
    .set({ isBanned: parsed.data.banned, bannedReason: parsed.data.reason ?? null })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ id: user.id, clerkId: user.clerkId, email: user.email, name: user.name, avatarUrl: user.avatarUrl ?? null, role: user.role, isBanned: user.isBanned, createdAt: user.createdAt.toISOString() });
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  const parsed = ListAllOrdersQueryParams.safeParse(req.query);
  const { status, page = 1 } = parsed.success ? parsed.data : { status: undefined, page: 1 };

  const conditions: any[] = [];
  if (status) conditions.push(eq(ordersTable.status, status as any));

  const allOrders = await db.select().from(ordersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt));

  const pageNum = Number(page);
  const limitNum = 20;
  const total = allOrders.length;
  const sliced = allOrders.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const orders = await Promise.all(sliced.map(async o => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
    return formatOrder(o, items);
  }));

  res.json({ orders, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

export default router;

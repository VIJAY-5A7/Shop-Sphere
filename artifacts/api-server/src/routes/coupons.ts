import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";
import { CreateCouponBody, ValidateCouponBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatCoupon(c: any) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: parseFloat(c.value),
    minOrderAmount: parseFloat(c.minOrderAmount),
    maxDiscount: c.maxDiscount ? parseFloat(c.maxDiscount) : null,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    isActive: c.isActive,
  };
}

router.post("/coupons/validate", async (req, res): Promise<void> => {
  const parsed = ValidateCouponBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { code, orderAmount } = parsed.data;

  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
  if (!coupon || !coupon.isActive) {
    res.json({ valid: false, discountAmount: 0, message: "Invalid or expired coupon" });
    return;
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    res.json({ valid: false, discountAmount: 0, message: "Coupon has expired" });
    return;
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    res.json({ valid: false, discountAmount: 0, message: "Coupon usage limit reached" });
    return;
  }
  const minOrder = parseFloat(coupon.minOrderAmount);
  if (orderAmount < minOrder) {
    res.json({ valid: false, discountAmount: 0, message: `Minimum order amount is ₹${minOrder}` });
    return;
  }

  let discountAmount = 0;
  if (coupon.type === "percent") {
    discountAmount = orderAmount * (parseFloat(coupon.value) / 100);
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscount));
  } else {
    discountAmount = Math.min(parseFloat(coupon.value), orderAmount);
  }

  res.json({ valid: true, coupon: formatCoupon(coupon), discountAmount: Math.round(discountAmount * 100) / 100, message: "Coupon applied successfully" });
});

router.get("/coupons", async (req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  res.json(coupons.map(formatCoupon));
});

router.post("/coupons", async (req, res): Promise<void> => {
  const parsed = CreateCouponBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [coupon] = await db.insert(couponsTable).values({
    ...parsed.data,
    code: parsed.data.code.toUpperCase(),
    value: String(parsed.data.value),
    minOrderAmount: String(parsed.data.minOrderAmount),
    maxDiscount: parsed.data.maxDiscount != null ? String(parsed.data.maxDiscount) : null,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  }).returning();
  res.status(201).json(formatCoupon(coupon));
});

export default router;

import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { CreateReviewBody, GetProductReviewsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = GetProductReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { productId, page = 1 } = parsed.data;

  const rows = await db
    .select({ review: reviewsTable, user: usersTable })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(10)
    .offset((Number(page) - 1) * 10);

  res.json(rows.map(r => ({
    id: r.review.id,
    userId: r.review.userId,
    userName: r.user?.name ?? "Anonymous",
    productId: r.review.productId,
    rating: r.review.rating,
    title: r.review.title,
    body: r.review.body,
    helpfulVotes: r.review.helpfulVotes,
    createdAt: r.review.createdAt.toISOString(),
  })));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const productId = parseInt(req.query.productId as string ?? "0", 10);

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [review] = await db.insert(reviewsTable).values({ ...parsed.data, userId: user.id, productId }).returning();
  res.status(201).json({
    id: review.id,
    userId: review.userId,
    userName: user.name,
    productId: review.productId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    helpfulVotes: review.helpfulVotes,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;

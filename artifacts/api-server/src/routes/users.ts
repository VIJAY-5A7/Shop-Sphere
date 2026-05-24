import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  SyncUserBody,
  UpdateMeBody,
  GetMeResponse,
  SyncUserResponse,
  UpdateMeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users/sync", async (req, res): Promise<void> => {
  const parsed = SyncUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { clerkId, email, name, avatarUrl } = parsed.data;
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  let user;
  if (existing.length > 0) {
    [user] = await db
      .update(usersTable)
      .set({ email, name, avatarUrl: avatarUrl ?? null })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
  } else {
    [user] = await db
      .insert(usersTable)
      .values({ clerkId, email, name, avatarUrl: avatarUrl ?? null })
      .returning();
  }
  res.json(SyncUserResponse.parse({
    ...user,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
});

router.get("/users/me", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetMeResponse.parse({
    ...user,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
});

router.patch("/users/me", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.clerkId, clerkId))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateMeResponse.parse({
    ...user,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
});

export default router;

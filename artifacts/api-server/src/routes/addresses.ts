import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, addressesTable, usersTable } from "@workspace/db";
import { CreateAddressBody, UpdateAddressBody, UpdateAddressParams, DeleteAddressParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

function formatAddress(a: any) {
  return { ...a, line2: a.line2 ?? null };
}

router.get("/addresses", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.json([]); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.json([]); return; }
  const rows = await db.select().from(addressesTable).where(eq(addressesTable.userId, userId));
  res.json(rows.map(formatAddress));
});

router.post("/addresses", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const parsed = CreateAddressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
  }

  const [address] = await db.insert(addressesTable).values({ ...parsed.data, userId, line2: parsed.data.line2 ?? null }).returning();
  res.status(201).json(formatAddress(address));
});

router.put("/addresses/:addressId", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId;
  const addressId = parseInt(raw, 10);

  const parsed = UpdateAddressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
  }

  const [address] = await db.update(addressesTable)
    .set({ ...parsed.data, line2: parsed.data.line2 ?? null })
    .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)))
    .returning();
  if (!address) { res.status(404).json({ error: "Address not found" }); return; }
  res.json(formatAddress(address));
});

router.delete("/addresses/:addressId", async (req, res): Promise<void> => {
  const clerkId = req.headers["x-clerk-user-id"] as string;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = await getUserId(clerkId);
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const raw = Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId;
  const addressId = parseInt(raw, 10);
  await db.delete(addressesTable).where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)));
  res.sendStatus(204);
});

export default router;

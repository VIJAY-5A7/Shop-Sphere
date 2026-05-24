import { pgTable, text, serial, timestamp, integer, numeric, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  images: text("images").array().notNull().default([]),
  categoryId: integer("category_id").notNull(),
  brand: text("brand").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  sellerId: integer("seller_id").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isFlashSale: boolean("is_flash_sale").notNull().default(false),
  flashSaleEnd: timestamp("flash_sale_end", { withTimezone: true }),
  variants: json("variants").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

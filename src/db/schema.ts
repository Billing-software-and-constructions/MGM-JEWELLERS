import { pgTable, text, timestamp, real, integer, uuid } from "drizzle-orm/pg-core";

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  bill_date: timestamp("bill_date").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  credited_amount: real("credited_amount"),
  customer_address: text("customer_address"),
  customer_gst_pan: text("customer_gst_pan"),
  customer_name: text("customer_name").notNull(),
  customer_phone: text("customer_phone"),
  discount_amount: real("discount_amount"),
  gold_rate: real("gold_rate").notNull(),
  grand_total: real("grand_total").notNull(),
  gst_amount: real("gst_amount").notNull(),
  gst_percentage: real("gst_percentage").notNull(),
  invoice_number: text("invoice_number"),
  subtotal: real("subtotal").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const subcategories = pgTable("subcategories", {
  id: uuid("id").primaryKey().defaultRandom(),
  category_id: uuid("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  seikuli_rate: real("seikuli_rate"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const bill_items = pgTable("bill_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bill_id: uuid("bill_id").references(() => bills.id).notNull(),
  category_id: uuid("category_id").references(() => categories.id).notNull(),
  category_name: text("category_name").notNull(),
  gold_amount: real("gold_amount").notNull(),
  seikuli_amount: real("seikuli_amount").notNull(),
  seikuli_rate: real("seikuli_rate").notNull(),
  subcategory_name: text("subcategory_name"),
  total: real("total").notNull(),
  weight: real("weight").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const old_exchanges = pgTable("old_exchanges", {
  id: uuid("id").primaryKey().defaultRandom(),
  bill_id: uuid("bill_id").references(() => bills.id),
  category_id: uuid("category_id").references(() => categories.id).notNull(),
  category_name: text("category_name").notNull(),
  customer_name: text("customer_name").notNull(),
  customer_phone: text("customer_phone"),
  customer_address: text("customer_address"),
  customer_gst_pan: text("customer_gst_pan"),
  exchange_type: text("exchange_type").notNull(),
  exchange_value: real("exchange_value").notNull(),
  final_weight: real("final_weight").notNull(),
  initial_weight: real("initial_weight").notNull(),
  metal_rate: real("metal_rate").notNull(),
  subcategory_id: uuid("subcategory_id").references(() => subcategories.id),
  subcategory_name: text("subcategory_name"),
  invoice_number: text("invoice_number"),
  credited_amount: real("credited_amount"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  gold_rate: real("gold_rate").notNull(),
  silver_rate: real("silver_rate").notNull(),
  gst_rate: real("gst_rate"),
  last_invoice_number: integer("last_invoice_number"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

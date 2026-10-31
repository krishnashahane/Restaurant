import { z } from "zod";

const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export const orderSchema = z
  .object({
    name: z.string().transform(clean).pipe(z.string().min(2, "Enter your name").max(60)),
    phone: z
      .string()
      .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
    type: z.enum(["dine-in", "takeaway", "delivery"]),
    table: z.string().transform(clean).pipe(z.string().max(10)).optional(),
    address: z.string().transform(clean).pipe(z.string().max(300)).optional(),
    notes: z.string().transform(clean).pipe(z.string().max(300)).optional(),
    items: z
      .array(z.object({ id: z.string().max(80), qty: z.number().int().min(1).max(25) }))
      .min(1, "Your cart is empty")
      .max(60),
    website: z.string().max(0).optional(), // honeypot: must stay empty
  })
  .superRefine((o, ctx) => {
    if (o.type === "dine-in" && !o.table)
      ctx.addIssue({ code: "custom", path: ["table"], message: "Enter your table number" });
    if (o.type === "delivery" && (!o.address || o.address.length < 10))
      ctx.addIssue({ code: "custom", path: ["address"], message: "Enter your full delivery address" });
  });

export type OrderInput = z.input<typeof orderSchema>;

export const STATUSES = ["new", "preparing", "ready", "completed", "cancelled"] as const;
export type Status = (typeof STATUSES)[number];
export const statusSchema = z.object({ status: z.enum(STATUSES) });

export type OrderLine = { id: string; name: string; price: number; qty: number };
export type Order = {
  id: string;
  code: string;
  created_at: string;
  customer_name: string;
  phone: string;
  order_type: "dine-in" | "takeaway" | "delivery";
  table_no: string | null;
  address: string | null;
  notes: string | null;
  items: OrderLine[];
  total: number;
  status: Status;
};

import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import OrderStatus from "@/components/OrderStatus";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <OrderStatus id={id} />;
}

import { connection } from "next/server";
import Menu from "@/components/Menu";
import { categories, items, restaurant } from "@/lib/menu";

export default async function Home() {
  await connection(); // dynamic render so the CSP nonce is applied
  return <Menu restaurant={restaurant} categories={categories} items={items} />;
}

import data from "@/data/menu.json";

export type MenuItem = {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string;
  image: string | null;
  jain: boolean;
};

export const restaurant = data.info;
export const categories: string[] = data.categories;
export const items: MenuItem[] = data.items as MenuItem[];

const byId = new Map(items.map((i) => [i.id, i]));
export function getItem(id: string): MenuItem | undefined {
  return byId.get(id);
}

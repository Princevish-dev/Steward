import type { Category } from "@/core/policy/types";

export type Product = {
  id: string;
  title: string;
  description: string;
  merchant: string;
  category: Category;
  price: number;
  currency: "USD";
  availability: "in_stock" | "out_of_stock";
  url: string;
};

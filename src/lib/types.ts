export type Category = "men" | "women" | "accessories";

export interface Product {
  id: string;
  slug: string;
  sku?: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  rating: number;
  reviews: number;
  badge?: "New" | "Sale" | "Bestseller";
  featured?: boolean;
  stock: number;
  productType?: "simple" | "variable";
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  sku: string;
  attributeSummary: string;
  price: number;
  salePrice?: number;
  stock: number;
  image?: string;
  isDefault: boolean;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  variantId?: number;
  variantSummary?: string;
}

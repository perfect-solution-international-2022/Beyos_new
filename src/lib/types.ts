export type Category = "men" | "women" | "accessories";
export type ProductPaymentMethod = "cod" | "onepay";

export interface Product {
  id: string;
  slug: string;
  sku?: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  imageAlt?: string;
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
  weightKg?: number;
  wholesalePrice?: number;
  paymentMethods: ProductPaymentMethod[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
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
  weightKg?: number;
  wholesalePrice?: number;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  wholesalePrice?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  variantId?: number;
  variantSummary?: string;
}

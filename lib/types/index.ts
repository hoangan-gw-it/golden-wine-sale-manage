export type UserRole = "admin" | "sale";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesRecord {
  id: string;
  productName: string;
  quantity: number;
  price: number; // Giá bán thực tế
  originalPrice?: number; // Giá gốc từ Shopify
  totalAmount: number;
  salesPersonId: string;
  salesPersonName: string;
  createdAt: Date;
  updatedAt: Date;
  date: string; // YYYY-MM-DD format for easy querying
}

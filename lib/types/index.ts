export type UserRole = "admin" | "sale" | "ipos";

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
  // Trạng thái duyệt đơn cho luồng sale -> admin
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNote?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
}

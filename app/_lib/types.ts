export type UserRole   = "admin" | "staff" | "client" ;
export type SaleStatus = "completed" | "pending" | "refunded";
export type PayMethod  = "card" | "cash" | "mobile";
export type StaffRole  = "cashier" | "supervisor" | "manager";
export type Tier       = "bronze" | "silver" | "gold" | "platinum";

export interface User {
  id:         string;
  full_name:  string;
  email:      string;
  role:       UserRole;
  store_name: string | null;
  domain:     string | null;
  created_at: string;
}

export interface Product {
  id:         string;
  name:       string;
  category:   string | null;
  price:      number;
  stock:      number;
  sku:        string | null;
  emoji:      string | null;
  created_at: string;
}

export interface Sale {
  id:         string;
  staff_id:   string;
  total:      number;
  tax:        number;
  method:     PayMethod;
  status:     SaleStatus;
  created_at: string;
}

export interface SaleItem {
  id:         string;
  sale_id:    string;
  product_id: string;
  quantity:   number;
  unit_price: number;
}

export interface CartItem extends Product {
  qty: number;
}
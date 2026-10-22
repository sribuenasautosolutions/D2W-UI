import { Product } from "./catalog";

export interface Store {
  id: number;
  name: string;
  code?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  [key: string]: any;
}

export interface Batch {
  id: number;
  batchNumber: string;
  inventoryId?: number;
  quantity: number;
  availableQuantity?: number;
  purchasePrice?: number;
  mrp?: number;
  sellingPrice?: number;
  expiryDate?: string;
  manufacturingDate?: string;
  [key: string]: any;
}

export interface InventoryItem {
  id: number;
  productId: number;
  product?: Product;
  storeId: number;
  currentStock: number;
  minStockAlert?: number;
  location?: string;
  batches?: Batch[];
  [key: string]: any;
}

export interface InventoryTransaction {
  id: number;
  storeId: number;
  type: string;
  quantity: number;
  referenceNumber?: string;
  note?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface OpeningStockItem {
  productId?: number;
  partNumber?: string;
  batchNumber?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  [key: string]: any;
}

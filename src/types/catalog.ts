export interface Brand {
  id: number;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  [key: string]: any;
}

export interface Category {
  id: number;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  [key: string]: any;
}

export interface ProductMaster {
  id: number;
  name: string;
  code?: string;
  partNumber?: string;
  description?: string;
  [key: string]: any;
}

export interface VehicleMake {
  id: number;
  name: string;
  code?: string;
  logoUrl?: string;
  [key: string]: any;
}

export interface VehicleModel {
  id: number;
  name: string;
  makeId: number;
  makeName?: string;
  [key: string]: any;
}

export interface VehicleGeneration {
  id: number;
  modelId: number;
  yearFrom?: number;
  yearTo?: number;
  name?: string;
  [key: string]: any;
}

export interface VehicleVariant {
  id: number;
  name: string;
  modelId?: number;
  generationId?: number;
  fuelType?: string;
  transmission?: string;
  year?: number | string;
  [key: string]: any;
}

export interface Product {
  id: number;
  partNumber: string;
  name: string;
  brand?: string | Brand;
  brandId?: number;
  category?: string | Category;
  categoryId?: number;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  unit?: string;
  hsnCode?: string;
  gstPercent?: number;
  description?: string;
  active?: boolean;
  [key: string]: any;
}

export interface FitmentItem {
  id?: number;
  makeId: number;
  modelId: number;
  year: string | number;
  make?: string;
  model?: string;
  [key: string]: any;
}

export interface FitmentPayload {
  partNumber: string;
  vehicles: {
    makeId: number;
    modelId: number;
    year: string | number;
  }[];
}

export interface LocalProduct {
  id?: number;
  partNumber?: string;
  name?: string;
  brandName?: string;
  categoryName?: string;
  mrp?: number;
  purchasePrice?: number;
  status?: string;
  storeId?: number;
  [key: string]: any;
}

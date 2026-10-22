import api from "./api";
import { User } from "../types/auth";

const activeStoreId = (user: User | null): string | number | undefined =>
  user?.role === "SUPER_ADMIN"
    ? (localStorage.getItem("pos_store_id") ?? undefined)
    : user?.storeId;

/*
|--------------------------------------------------------------------------
| GET PRODUCTS BY VEHICLE VARIANT
|--------------------------------------------------------------------------
*/
export const getProductsByVariant = async (
  variantId: number | string,
): Promise<any> => {
  const rawUser = localStorage.getItem("user");
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;

  const response = await api.get("/fitment/products", {
    params: {
      storeId: activeStoreId(user),
      variantId,
    },
  });

  return response.data;
};

export const getAllProducts = async (page = 0, size = 9): Promise<any> => {
  const rawUser = localStorage.getItem("user");
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;

  const response = await api.get(
    `/store-inventory/store/${activeStoreId(user)}/paged`,
    { params: { page, size, onlyAvailable: true } },
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| GET PRODUCT DETAILS
|--------------------------------------------------------------------------
*/
export const getInventoryDetails = async (
  inventoryId: number | string,
): Promise<any> => {
  const rawUser = localStorage.getItem("user");
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;

  const response = await api.get("/store-inventory/product-details", {
    params: {
      storeId: activeStoreId(user),
      inventoryId,
    },
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| SEARCH PRODUCTS
|--------------------------------------------------------------------------
*/
export const searchProducts = async (
  text: string,
  storeId: number | string,
): Promise<any[]> => {
  const response = await api.get(`/store-inventory/store/${storeId}/paged`, {
    params: { search: text, page: 0, size: 50, onlyAvailable: true },
  });

  return response.data.content || [];
};

export const getCompatibleVehicles = async (
  productId: number | string,
): Promise<any> => {
  const response = await api.get("/fitment/product", {
    params: {
      productId,
    },
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| GET PRODUCT BATCHES
|--------------------------------------------------------------------------
*/
export const getProductBatches = async (
  inventoryId: number | string,
): Promise<any> => {
  const rawUser = localStorage.getItem("user");
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;

  const response = await api.get("/store-inventory/product-batches", {
    params: {
      storeId: activeStoreId(user),
      inventoryId,
    },
  });

  return response.data;
};

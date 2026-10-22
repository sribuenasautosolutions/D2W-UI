import api from "./api";
import { Brand, Category, ProductMaster } from "../types/catalog";

export const getAllBrands = async (): Promise<Brand[]> => {
  const response = await api.get<Brand[]>("/brands");
  return response.data;
};

export const getAllCategories = async (): Promise<Category[]> => {
  const response = await api.get<Category[]>("/categories");
  return response.data;
};

export const getAllProductMasters = async (): Promise<ProductMaster[]> => {
  const response = await api.get<ProductMaster[]>("/product-masters");
  return response.data;
};

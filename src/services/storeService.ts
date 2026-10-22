import api from "./api";
import { Store } from "../types/inventory";

export const getAllStores = async (): Promise<Store[]> => {
  const response = await api.get<Store[]>(`/stores`);

  return response.data;
};

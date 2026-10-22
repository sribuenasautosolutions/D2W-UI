import api from "./api";
import { Salesperson } from "../types/sales";

export async function getSalespersons(
  storeId?: number | string,
): Promise<Salesperson[]> {
  const response = await api.get<Salesperson[]>("/salespersons", {
    params: { storeId },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function createSalesperson(
  salesperson: Partial<Salesperson>,
): Promise<Salesperson> {
  const response = await api.post<Salesperson>("/salespersons", salesperson);
  return response.data;
}

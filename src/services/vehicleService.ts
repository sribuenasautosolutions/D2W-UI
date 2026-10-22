import api from "./api";
import { VehicleMake, VehicleModel, VehicleVariant } from "../types/catalog";

export const getAllMakes = async (): Promise<VehicleMake[]> => {
  const response = await api.get("/vehicle-makes");
  return response.data.data;
};

export const getModelsByMake = async (
  makeId: number | string,
): Promise<VehicleModel[]> => {
  const response = await api.get(`/vehicle-models/by-make/${makeId}`);
  return response.data.data;
};

export const getYearsByModel = async (
  modelId: number | string,
): Promise<any[]> => {
  const response = await api.get(
    `/vehicle-generations/years?modelId=${modelId}`,
  );
  return response.data.data;
};

export const getVariantsByModelAndYear = async (
  modelId: number | string,
  year: number | string,
): Promise<VehicleVariant[]> => {
  const response = await api.get(
    `/vehicle-generations/variants?modelId=${modelId}&year=${year}`,
  );
  return response.data.data;
};

import apiclient from "./apiclient";
import { FitmentItem, VehicleMake, VehicleModel } from "../types/catalog";

/* Makes */
export const fetchFitmentMakes = async (): Promise<VehicleMake[]> => {
  const { data } = await apiclient.get("/fitments/makes");
  return data;
};

/* Models for a make */
export const fetchFitmentModels = async (
  makeId: number | string,
): Promise<VehicleModel[]> => {
  const { data } = await apiclient.get(`/fitments/makes/${makeId}/models`);
  return data;
};

/* Years for a make + model */
export const fetchFitmentYears = async (
  makeId: number | string,
  modelId: number | string,
): Promise<{ value: string | number }[]> => {
  const { data } = await apiclient.get(
    `/fitments/makes/${makeId}/models/${modelId}/years`,
  );
  return data;
};

/* Existing fits for a part */
export const fetchFitments = async (
  partNumber: string,
): Promise<FitmentItem[]> => {
  const { data } = await apiclient.get(
    `/products/${encodeURIComponent(partNumber)}/fitments`,
  );
  return data;
};

/* Save fits (replace) for a part */
export const saveFitments = async (
  partNumber: string,
  fits: Array<{ makeId: number; modelId: number; year: string | number }>,
): Promise<any> => {
  const payload = {
    partNumber,
    vehicles: fits.map((f) => ({
      makeId: f.makeId,
      modelId: f.modelId,
      year: f.year,
    })),
  };
  const { data } = await apiclient.put(
    `/products/${encodeURIComponent(partNumber)}/fitments`,
    payload,
  );
  return data;
};

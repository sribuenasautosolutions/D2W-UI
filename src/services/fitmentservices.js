import apiclient from "./apiclient";

/* Makes */
export const fetchFitmentMakes = async () => {
    const { data } = await apiclient.get("/fitments/makes");
    return data; // [{ id, name }]
};

/* Models for a make */
export const fetchFitmentModels = async (makeId) => {
    const { data } = await apiclient.get(`/fitments/makes/${makeId}/models`);
    return data; // [{ id, name }]
};

/* Years for a make + model */
export const fetchFitmentYears = async (makeId, modelId) => {
    const { data } = await apiclient.get(
        `/fitments/makes/${makeId}/models/${modelId}/years`
    );
    return data; // [{ value: "2018" }, ...]
};

/* Existing fits for a part */
export const fetchFitments = async (partNumber) => {
    const { data } = await apiclient.get(
        `/products/${encodeURIComponent(partNumber)}/fitments`
    );
    return data; // [{ id, makeId, modelId, year, make, model }]
};

/* Save fits (replace) for a part */
export const saveFitments = async (partNumber, fits) => {
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
        payload
    );
    return data;
};
import api from "./api";

export const getAllMakes = async () => {
    const response = await api.get("/vehicle-makes");
    return response.data.data;
};

export const getModelsByMake = async (makeId) => {
    const response = await api.get(`/vehicle-models/by-make/${makeId}`);
    return response.data.data;
};
export const getYearsByModel = async (modelId) => {
    const response = await api.get(
        `/vehicle-generations/years?modelId=${modelId}`
    );
    return response.data.data;
};

export const getVariantsByModelAndYear = async (modelId, year) => {
    const response = await api.get(
        `/vehicle-generations/variants?modelId=${modelId}&year=${year}`
    );
    return response.data.data;
};

// export const getGenerationsByModel = async (modelId) => {
//     const response = await api.get(`/vehicle-generations/by-model/${modelId}`);
//     return response.data.data;
// };

// export const getVariantsByGeneration = async (generationId) => {
//     const response = await api.get(`/vehicle-variants/by-generation/${generationId}`);
//     return response.data.data;
// };
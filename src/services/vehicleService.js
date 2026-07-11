import api from "./api";

export const getAllMakes =
    async () => {

        const response =
            await api.get(
                "/vehicle-makes"
            );

        return response.data;
    };

export const getModelsByMake =
    async (makeId) => {

        const response =
            await api.get(
                `/vehicle-models/by-make/${makeId}`
            );

        return response.data;
    };

export const getGenerationsByModel =
    async (modelId) => {

        const response =
            await api.get(
                `/vehicle-generations/by-model/${modelId}`
            );

        return response.data;
    };

export const getVariantsByGeneration =
    async (generationId) => {

        const response =
            await api.get(
                `/vehicle-variants/by-generation/${generationId}`
            );

        return response.data;
    };

    export const getYears = async () => {

    const response =
        await api.get(
            "/vehicle-variants/years"
        );

    return response.data;
};

export const getMakesByYear = async (year) => {

    const response =
        await api.get(
            `/vehicle-variants/makes/${year}`
        );

    return response.data;
};

export const getModelsByYearAndMake =
    async (year, make) => {

        const response =
            await api.get(
                `/vehicle-variants/models?year=${year}&make=${make}`
            );

        return response.data;
};

export const getVariantsByYearMakeModel =
    async (year, make, model) => {

        const response =
            await api.get(
                `/vehicle-variants/variants?year=${year}&make=${make}&model=${model}`
            );

        return response.data;
};
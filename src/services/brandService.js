import api from "./api";

/*
|--------------------------------------------------------------------------
| GET ALL BRANDS
|--------------------------------------------------------------------------
*/

export const getAllBrands = async () => {

    const response = await api.get("/brands");

    return response.data;

};


export const getAllCategories = async () => {
    const response = await api.get("/categories");
    return response.data;
};


export const getAllProductMasters = async () => {
    const response = await api.get("/product-masters");
    return response.data;
};
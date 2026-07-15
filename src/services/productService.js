import api from "./api";

const API =
    "http://localhost:8080";

/*
|--------------------------------------------------------------------------
| GET PRODUCTS BY VEHICLE VARIANT
|--------------------------------------------------------------------------
*/
export const getProductsByVariant =
    async (variantId) => {

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        const response =
            await api.get(

                `${API}/fitment/products`,
                {
                    params: {
                        storeId: user.storeId,
                        variantId
                    }
                }
            );

        return response.data; 
    };



export const getAllProducts =
    async () => {



        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        /*
        |--------------------------------------------------------------------------
        | STORE INVENTORY API
        |--------------------------------------------------------------------------
        */

        const response =
            await api.get(

                `${API}/store-inventory/store/${user.storeId}`
            );

        return response.data;
    };

/*
|--------------------------------------------------------------------------
| GET PRODUCT DETAILS
|--------------------------------------------------------------------------
*/

export const getProductById =
    async (id) => {

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        const response =
            await api.get(
                `${API}/store-inventory/product-details`,
                {
                    params: {
                        storeId: user.storeId,
                        productId: id
                    }
                }
            );

        return response.data;
    };

/*
|--------------------------------------------------------------------------
| SEARCH PRODUCTS
|--------------------------------------------------------------------------
*/

export const searchProducts =
    async (
        text,
        storeId
    ) => {

        const response =
            await api.get(

                `${API}/products/search`,

                {
                    params: {
                        text,
                        storeId
                    }
                }
            );

        return response.data;
    };
    export const getCompatibleVehicles =
    async (productId) => {

        const response =
            await api.get(
                `${API}/fitment/product`,
                {
                    params: {
                        productId
                    }
                }
            );

        return response.data;
    };
    /*
|--------------------------------------------------------------------------
| GET PRODUCT BATCHES
|--------------------------------------------------------------------------
*/

export const getProductBatches =
    async (productId) => {

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        const response =
            await api.get(

                `${API}/store-inventory/product-batches`,

                {
                    params: {
                        storeId: user.storeId,
                        productId
                    }
                }
            );

        return response.data;
    };
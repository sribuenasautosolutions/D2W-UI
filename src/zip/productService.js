import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/*
|--------------------------------------------------------------------------
| GET PRODUCTS BY VEHICLE VARIANT
|--------------------------------------------------------------------------
*/

export const getProductsByVariant =
    async (variantId) => {

        const response =
            await axios.get(

                `${API}/fitment/products?variantId=${variantId}`
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
            await axios.get(

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

        const response =
            await axios.get(

                `${API}/products/${id}`
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
            await axios.get(

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
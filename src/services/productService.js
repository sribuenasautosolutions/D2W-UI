    import api from "./api";
    const activeStoreId = (user) => localStorage.getItem("pos_store_id") || user?.storeId;
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
                    "/fitment/products",
                    {
                        params: {
                            storeId: activeStoreId(user),
                            variantId
                        }
                    }
                );

            return response.data; 
        };



    export const getAllProducts =
        async (page = 0, size = 9) => {



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
        `/store-inventory/store/${activeStoreId(user)}/paged`,
        { params: { page, size, onlyAvailable: true } }
    );

            return response.data;
        };

    /*
    |--------------------------------------------------------------------------
    | GET PRODUCT DETAILS
    |--------------------------------------------------------------------------
    */

 export const getInventoryDetails = async (inventoryId) => {

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    const response = await api.get(
        "/store-inventory/product-details",
        {
            params: {
                storeId: activeStoreId(user),
                inventoryId
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

            const response = await api.get(
                `/store-inventory/store/${storeId}/paged`,
                { params: { search: text, page: 0, size: 50, onlyAvailable: true } }
            );

            return response.data.content || [];
        };
        export const getCompatibleVehicles =
        async (productId) => {

            const response =
            await api.get(
        "/fitment/product",
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
        async (inventoryId) => {

            const user =
                JSON.parse(
                    localStorage.getItem("user")
                );

            const response =
            await api.get(
        "/store-inventory/product-batches",
                    {
                        params: {
                            storeId: activeStoreId(user),
                            inventoryId
                        }
                    }
                );

            return response.data;
        };

import {
    createContext,
    useContext,
    useState,
    useEffect
}
from "react";

const CartContext =
    createContext();

export const CartProvider =
    ({ children }) => {

        const [cartItems, setCartItems] =
            useState(() => {

                const savedCart =
                    localStorage.getItem(
                        "cartItems"
                    );

                return savedCart
                    ? JSON.parse(savedCart)
                    : [];
            });

        useEffect(() => {

            localStorage.setItem(

                "cartItems",

                JSON.stringify(cartItems)
            );

        }, [cartItems]);

        const addToCart =
            (product) => {
console.log("product=",product);
               const inventoryId = product.inventoryId;
const batchId = product.batchId;

const existingItem =
    cartItems.find(

        (item) =>

            item.inventoryId === inventoryId &&

            item.batchId === batchId
    );

                if(existingItem)
                {

                    const updatedCart =
                        cartItems.map((item) =>

                            item.inventoryId === inventoryId &&
                            item.batchId === batchId

                                ? {
                                    ...item,
                                    quantity:
                                        item.quantity + 1
                                }

                                : item
                        );

                    setCartItems(updatedCart);
                }

                else {

                    setCartItems([

                        ...cartItems,

         {
    ...product,

    inventoryId:
        inventoryId,
          batchId:
        batchId,

    quantity: 1,

    itemDiscount:
        product.discountPercentage || 0,

    gstPercentage:
        product.gstPercentage || 0,

    hsnCode:
        product.hsnCode ||
        product.hsncode ||
        ""
}
                    ]);
                }
            };

        const increaseQuantity =
    (inventoryId, batchId) => {

                const updatedCart =
                    cartItems.map((item) =>

                       item.inventoryId === inventoryId &&item.batchId === batchId

                            ? {
                                ...item,
                                quantity:
                                    item.quantity + 1
                            }

                            : item
                    );

                setCartItems(updatedCart);
            };

        const decreaseQuantity =
    (inventoryId, batchId) => {

                const updatedCart =
                    cartItems.map((item) =>

                        item.inventoryId === inventoryId &&
                           item.batchId === batchId
                            ? {
                                ...item,
                                quantity:
                                    item.quantity > 1
                                        ? item.quantity - 1
                                        : 1
                            }

                            : item
                    );

                setCartItems(updatedCart);
            };

       const removeFromCart =
    (inventoryId, batchId) => {

                const updatedCart =
                    cartItems.filter(
                        (item) => !(
                            item.inventoryId === inventoryId &&
                            item.batchId === batchId
                        )
                    );

                setCartItems(updatedCart);
            };

        const clearCart =
            () => {

                setCartItems([]);
            };
        const replaceCart = (items) => {
            setCartItems(Array.isArray(items) ? items : []);
        };
const updateDiscount =
    (inventoryId,batchId, discount )  => {

        const updatedCart =
            cartItems.map((item) =>

                item.inventoryId === inventoryId
                &&
                 item.batchId === batchId

                    ? {
                        ...item,
                        itemDiscount:
                            Number(discount)
                    }

                    : item
            );

        setCartItems(updatedCart);
    };
        return (

            <CartContext.Provider
               value={{

    cartItems,

    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    replaceCart,
    updateDiscount
}}
            >

                {children}

            </CartContext.Provider>
        );
    };

export const useCart =
    () => useContext(CartContext);

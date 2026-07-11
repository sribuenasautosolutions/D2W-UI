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
                const productId =
                    product.productId ||
                    product.id;

                const existingItem =
                    cartItems.find(

                        (item) =>
                            item.productId === productId
                    );

                if(existingItem)
                {

                    const updatedCart =
                        cartItems.map((item) =>

                            item.productId === productId

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

    productId:
        productId,

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
            (productId) => {

                const updatedCart =
                    cartItems.map((item) =>

                        item.productId === productId

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
            (productId) => {

                const updatedCart =
                    cartItems.map((item) =>

                        item.productId === productId

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
            (productId) => {

                const updatedCart =
                    cartItems.filter(

                        (item) =>
                            item.productId !== productId
                    );

                setCartItems(updatedCart);
            };

        const clearCart =
            () => {

                setCartItems([]);
            };
const updateDiscount =
    (productId, discount) => {

        const updatedCart =
            cartItems.map((item) =>

                item.productId === productId

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
    updateDiscount
}}
            >

                {children}

            </CartContext.Provider>
        );
    };

export const useCart =
    () => useContext(CartContext);
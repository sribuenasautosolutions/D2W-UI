import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";

export interface CartItem {
  inventoryId?: number | string | null;
  batchId?: number | string | null;
  quantity: number;
  availableQuantity?: number | string | null;
  inventoryStock?: number | string | null;
  stock?: number | string | null;
  itemName?: string;
  productName?: string;
  itemDiscount?: number;
  gstPercentage?: number;
  hsnCode?: string;
  discountPercentage?: number;
  [key: string]: any;
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: any) => boolean;
  removeFromCart: (inventoryId: any, batchId: any) => void;
  increaseQuantity: (inventoryId: any, batchId: any) => boolean;
  decreaseQuantity: (inventoryId: any, batchId: any) => void;
  clearCart: () => void;
  replaceCart: (items: any[]) => void;
  updateDiscount: (
    inventoryId: any,
    batchId: any,
    discount: number | string,
  ) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const sameLine = (item: CartItem, inventoryId: any, batchId: any) =>
  item.inventoryId === inventoryId && item.batchId === batchId;

const stockLimit = (item: CartItem): number | null => {
  const values = [item.availableQuantity, item.inventoryStock, item.stock]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return values.length ? Math.min(...values) : null;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cartItems") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const cartRef = useRef<CartItem[]>(cartItems);

  const commit = (items: CartItem[]) => {
    cartRef.current = items;
    setCartItems(items);
  };

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const canIncrease = (
    item: CartItem,
    nextQuantity: number,
    items: CartItem[] = cartRef.current,
  ): boolean => {
    const limit = stockLimit(item);
    const inventoryLimit = Number(item.inventoryStock);
    const hasLine = items.some((line) =>
      sameLine(line, item.inventoryId, item.batchId),
    );
    const total =
      (hasLine ? 0 : nextQuantity) +
      items
        .filter((line) => line.inventoryId === item.inventoryId)
        .reduce(
          (sum, line) =>
            sum +
            (sameLine(line, item.inventoryId, item.batchId)
              ? nextQuantity
              : Number(line.quantity)),
          0,
        );

    if (
      (limit !== null && nextQuantity > limit) ||
      (item.inventoryStock != null &&
        Number.isFinite(inventoryLimit) &&
        total > inventoryLimit)
    ) {
      window.alert(
        "Only " +
          (limit ?? inventoryLimit) +
          " available for " +
          (item.itemName || item.productName || "this product") +
          ". Quantity was not increased.",
      );
      return false;
    }
    return true;
  };

  const increaseQuantity = (inventoryId: any, batchId: any): boolean => {
    const items = cartRef.current;
    const item = items.find((line) => sameLine(line, inventoryId, batchId));
    if (!item || !canIncrease(item, Number(item.quantity) + 1)) return false;
    commit(
      items.map((line) =>
        sameLine(line, inventoryId, batchId)
          ? { ...line, quantity: Number(line.quantity) + 1 }
          : line,
      ),
    );
    return true;
  };

  const addToCart = (product: any): boolean => {
    const items = cartRef.current;
    const existing = items.find((line) =>
      sameLine(line, product.inventoryId, product.batchId),
    );
    const item: CartItem = {
      ...existing,
      ...product,
      inventoryStock: product.inventoryStock ?? product.quantity,
      quantity: existing ? Number(existing.quantity) : 0,
    };
    const nextQuantity = item.quantity + 1;
    if (!canIncrease(item, nextQuantity)) return false;

    if (existing) {
      commit(
        items.map((line) =>
          sameLine(line, item.inventoryId, item.batchId)
            ? { ...item, quantity: nextQuantity }
            : line,
        ),
      );
    } else {
      commit([
        ...items,
        {
          ...item,
          quantity: 1,
          itemDiscount: product.discountPercentage || 0,
          gstPercentage: product.gstPercentage || 0,
          hsnCode: product.hsnCode || product.hsncode || "",
        },
      ]);
    }
    return true;
  };

  const decreaseQuantity = (inventoryId: any, batchId: any) =>
    commit(
      cartRef.current.map((item) =>
        sameLine(item, inventoryId, batchId)
          ? { ...item, quantity: Math.max(1, Number(item.quantity) - 1) }
          : item,
      ),
    );

  const removeFromCart = (inventoryId: any, batchId: any) =>
    commit(
      cartRef.current.filter((item) => !sameLine(item, inventoryId, batchId)),
    );

  const clearCart = () => commit([]);

  const replaceCart = (items: any[]) =>
    commit(Array.isArray(items) ? items : []);

  const updateDiscount = (
    inventoryId: any,
    batchId: any,
    discount: number | string,
  ) =>
    commit(
      cartRef.current.map((item) =>
        sameLine(item, inventoryId, batchId)
          ? { ...item, itemDiscount: Number(discount) }
          : item,
      ),
    );

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
        updateDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

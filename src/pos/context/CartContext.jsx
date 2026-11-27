import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from "react";

const CartContext = createContext();
const sameLine = (item, inventoryId, batchId) =>
  item.inventoryId === inventoryId && item.batchId === batchId;
const stockLimit = (item) => {
  const values = [item.availableQuantity, item.inventoryStock, item.stock]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number).filter((value) => Number.isFinite(value) && value >= 0);
  return values.length ? Math.min(...values) : null;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cartItems") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const cartRef = useRef(cartItems);
  const commit = (items) => { cartRef.current = items; setCartItems(items); };
  useEffect(() => { localStorage.setItem("cartItems", JSON.stringify(cartItems)); }, [cartItems]);

  const canIncrease = useCallback((item, nextQuantity, items = cartRef.current) => {
    const limit = stockLimit(item);
    const inventoryLimit = Number(item.inventoryStock);
    const hasLine = items.some((line) => sameLine(line, item.inventoryId, item.batchId));
    const total = (hasLine ? 0 : nextQuantity) + items.filter((line) => line.inventoryId === item.inventoryId)
      .reduce((sum, line) => sum + (sameLine(line, item.inventoryId, item.batchId) ? nextQuantity : Number(line.quantity)), 0);
    if ((limit !== null && nextQuantity > limit) ||
        (item.inventoryStock != null && Number.isFinite(inventoryLimit) && total > inventoryLimit)) {
      window.alert("Only " + (limit ?? inventoryLimit) + " available for " + (item.itemName || item.productName || "this product") + ". Quantity was not increased.");
      return false;
    }
    return true;
  }, []);
  const increaseQuantity = useCallback((inventoryId, batchId) => {
    const items = cartRef.current;
    const item = items.find((line) => sameLine(line, inventoryId, batchId));
    if (!item || !canIncrease(item, Number(item.quantity) + 1)) return false;
    commit(items.map((line) => sameLine(line, inventoryId, batchId) ? { ...line, quantity: Number(line.quantity) + 1 } : line));
    return true;
  }, [canIncrease]);
  const addToCart = useCallback((product) => {
    const items = cartRef.current;
    const existing = items.find((line) => sameLine(line, product.inventoryId, product.batchId));
    const item = { ...existing, ...product, inventoryStock: product.inventoryStock ?? product.quantity,
      quantity: existing ? Number(existing.quantity) : 0 };
    const nextQuantity = item.quantity + 1;
    if (!canIncrease(item, nextQuantity)) return false;
    if (existing) commit(items.map((line) => sameLine(line, item.inventoryId, item.batchId) ? { ...item, quantity: nextQuantity } : line));
    else commit([...items, { ...item, quantity: 1, itemDiscount: product.discountPercentage || 0,
      gstPercentage: product.gstPercentage || 0, hsnCode: product.hsnCode || product.hsncode || "" }]);
    return true;
  }, [canIncrease]);
  const decreaseQuantity = useCallback((inventoryId, batchId) => commit(cartRef.current.map((item) =>
    sameLine(item, inventoryId, batchId) ? { ...item, quantity: Math.max(1, Number(item.quantity) - 1) } : item)), []);
  const removeFromCart = useCallback((inventoryId, batchId) => commit(cartRef.current.filter((item) => !sameLine(item, inventoryId, batchId))), []);
  const clearCart = useCallback(() => commit([]), []);
  const replaceCart = useCallback((items) => commit(Array.isArray(items) ? items : []), []);
  const updateDiscount = useCallback((inventoryId, batchId, discount) => commit(cartRef.current.map((item) =>
    sameLine(item, inventoryId, batchId) ? { ...item, itemDiscount: Number(discount) } : item)), []);

  const value = useMemo(() => ({
    cartItems, addToCart, removeFromCart, increaseQuantity,
    decreaseQuantity, clearCart, replaceCart, updateDiscount
  }), [cartItems, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, replaceCart, updateDiscount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
export const useCart = () => useContext(CartContext);
import api from "./api";

export const getVendorOrders = async (date: string): Promise<any> =>
  (await api.get("/api/vendor-orders", { params: { date } })).data;

export const downloadVendorOrders = async (
  date: string,
  vendorId?: number | string | null,
  storeId?: number | string | null,
): Promise<void> => {
  const response = await api.get("/api/vendor-orders/export", {
    params: {
      date,
      vendorId: vendorId || undefined,
      storeId: storeId || undefined,
    },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `D2W_Vendor_Order_${date}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

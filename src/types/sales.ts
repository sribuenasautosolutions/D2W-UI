export interface Customer {
  id?: number;
  customerName: string;
  mobileNumber: string;
  email?: string;
  gstin?: string;
  gstRegistrationType?: string;
  state?: string;
  billingAddress?: string;
  shippingAddress?: string;
  [key: string]: any;
}

export interface Salesperson {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  storeId?: number;
  active?: boolean;
  [key: string]: any;
}

export interface OrderItem {
  productId: number;
  productName?: string;
  partNumber?: string;
  quantity: number;
  unitPrice?: number;
  sellingPrice?: number;
  discountPercentage?: number;
  gstType?: string;
  gstPercent?: number;
  amount?: number;
  batchId?: number | null;
  [key: string]: any;
}

export interface OrderRequestDTO {
  customerName?: string;
  phone?: string;
  address?: string;
  paymentMethod?: string;
  billDiscountPercent?: number;
  items: OrderItem[];
  storeId: number;
  salespersonId?: number;
  [key: string]: any;
}

export interface OrderCalculationRequestDTO {
  storeId: number | string;
  billDiscountPercent?: number;
  items: any[];
  [key: string]: any;
}

export interface OrderCalculationResponseDTO {
  grossAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOff?: number;
  netPayable?: number;
  [key: string]: any;
}

export interface InvoiceResponseDTO {
  id: number;
  orderNumber?: string;
  invoiceNumber?: string;
  customer?: Customer;
  items: any[];
  totalAmount?: number;
  taxAmount?: number;
  netPayable?: number;
  createdAt?: string;
  [key: string]: any;
}

export interface ProformaInvoice {
  id: number;
  proformaNumber?: string;
  customerId?: number;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerGstRegistrationType?: string;
  customerState?: string;
  billingAddress?: string;
  shippingAddress?: string;
  storeId?: number;
  items?: any[];
  subTotal?: number;
  totalDiscount?: number;
  totalGst?: number;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SalesPaymentCreateDTO {
  orderId: number;
  amount?: number;
  paymentMethod?: string;
  collectedBy?: string;
  payments?: any[];
  referenceNumber?: string;
  notes?: string;
  [key: string]: any;
}

export interface SalesPaymentCalculationRequestDTO {
  orderId: number;
  paymentMethod?: string;
  amount?: number;
  [key: string]: any;
}

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "OFFER_SUBMITTED"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "CANCELLED"
  | (string & {});

export interface LeadItem {
  id?: number;
  leadId?: number;
  partNumber?: string;
  productName?: string;
  brandName?: string;
  quantity?: number;
  targetPrice?: number;
  status?: string;
  [key: string]: any;
}

export interface Lead {
  id: number;
  leadNumber?: string;
  customerName: string;
  customerPhone?: string;
  phone?: string;
  customerEmail?: string;
  email?: string;
  status: LeadStatus;
  storeId?: number;
  notes?: string;
  salespersonId?: number | null;
  salespersonName?: string | null;
  nextFollowUpAt?: string | null;
  items?: LeadItem[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ProcurementRequirement {
  id?: number;
  leadId?: number;
  partNumber?: string;
  productName?: string;
  brand?: string;
  quantity?: number;
  status?: string;
  targetPrice?: number;
  source?: string;
  [key: string]: any;
}

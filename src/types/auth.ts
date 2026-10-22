export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "STORE_MANAGER"
  | "SALESPERSON"
  | "PURCHASE_MANAGER"
  | (string & {});

export interface User {
  id?: number | string;
  username?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  storeId?: number | string;
  storeName?: string;
  token?: string;
  refreshToken?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password?: string;
  [key: string]: any;
}

export interface AuthResponse {
  token?: string;
  refreshToken?: string;
  user?: User;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

export interface PageMeta {
  totalElements?: number;
  totalPages?: number;
  pageNumber?: number;
  pageSize?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface PaginatedResponse<T = any> extends PageMeta {
  content: T[];
  [key: string]: any;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
  details?: any;
}

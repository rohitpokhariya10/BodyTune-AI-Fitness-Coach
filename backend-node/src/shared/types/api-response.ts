export interface ApiMeta {
  requestId: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  code?: string;
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors: ApiErrorDetail[];
  requestId: string;
  stack?: string;
}

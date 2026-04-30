const fallbackApiBaseUrl = "http://127.0.0.1:9000";

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiBaseUrl,
};

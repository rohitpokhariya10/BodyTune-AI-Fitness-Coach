import { env } from "@/shared/config/env";

export const apiBaseUrl = env.apiBaseUrl;

const authTokenStorageKey = "fitcoach_auth_token";
const authUserStorageKey = "fitcoach_auth_user";
const authUnauthorizedEvent = "fitcoach:auth:unauthorized";

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

type RequestOptions = RequestInit & {
  body?: BodyInit | null;
};

type ValidationErrorDetail = {
  loc?: unknown;
  msg?: unknown;
};

function formatValidationLocation(loc: unknown) {
  if (!Array.isArray(loc)) {
    return "";
  }

  return loc
    .filter((part) => part !== "body")
    .map((part) => String(part))
    .join(".");
}

function formatErrorDetail(detail: unknown) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const validationItem = item as ValidationErrorDetail;
        const location = formatValidationLocation(validationItem.loc);
        const message =
          typeof validationItem.msg === "string" ? validationItem.msg : null;
        if (!message) {
          return null;
        }

        return location ? `${location}: ${message}` : message;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return null;
}

export const apiClient = {
  baseUrl: apiBaseUrl,

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const isFormData = options.body instanceof FormData;

    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = localStorage.getItem(authTokenStorageKey);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: "omit",
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem(authTokenStorageKey);
      localStorage.removeItem(authUserStorageKey);
      window.dispatchEvent(new Event(authUnauthorizedEvent));
    }

    if (!response.ok) {
      let message = `API request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as {
          detail?: unknown;
          message?: unknown;
        };
        const detailMessage = formatErrorDetail(payload.detail);
        if (detailMessage) {
          message = detailMessage;
        } else if (typeof payload.message === "string") {
          message = payload.message;
        }
      } catch {
        // Keep the status-based fallback when the response body is not JSON.
      }
      throw new ApiClientError(
        message,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  },
};

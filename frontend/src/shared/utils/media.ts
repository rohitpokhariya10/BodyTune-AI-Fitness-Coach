import { apiBaseUrl } from "@/shared/api/client";

const absoluteUrlPattern = /^https?:\/\//i;

export function isHttpUrl(value: string) {
  return absoluteUrlPattern.test(value.trim());
}

export function resolveMediaUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) {
    return "";
  }
  if (absoluteUrlPattern.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${apiBaseUrl}${url}`;
  }
  return url;
}

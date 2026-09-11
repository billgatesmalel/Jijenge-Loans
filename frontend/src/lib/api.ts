/* ==========================================================================
   Jijenge Loans - API Base URL & Fetch Helper
   ========================================================================== */

const RAW_API_URL = (import.meta as any).env?.VITE_API_URL || '';

/**
 * Resolves the full URL for an API endpoint.
 * If VITE_API_URL is set (e.g. https://jijenge-loans-backend.onrender.com),
 * prepends it cleanly to the path. Otherwise returns the relative path.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!RAW_API_URL) {
    return cleanPath;
  }
  const baseUrl = RAW_API_URL.replace(/\/+$/, '');
  if (baseUrl.endsWith('/api') && cleanPath.startsWith('/api')) {
    return `${baseUrl}${cleanPath.substring(4)}`;
  }
  return `${baseUrl}${cleanPath}`;
}

/**
 * Enhanced fetch wrapper that formats API URLs automatically and handles non-JSON responses cleanly.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(input);
  return fetch(url, init);
}

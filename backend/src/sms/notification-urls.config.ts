/**
 * Centralized Public URL Configuration for Jijenge Loans
 * Generates canonical customer-facing links for SMS notifications and communications.
 */

export interface PublicUrlsConfig {
  baseUrl: string;
  website: string;
  apply: string;
  track: (ref?: string) => string;
  customerPortal: string;
  support: (chatToken?: string) => string;
  terms: string;
  privacy: string;
}

export function getPublicUrls(overrideBaseUrl?: string): PublicUrlsConfig {
  const rawBase =
    overrideBaseUrl ||
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_URL ||
    'https://jijengeloans.vercel.app';

  const baseUrl = rawBase.replace(/\/$/, '');

  return {
    baseUrl,
    website: baseUrl,
    apply: `${baseUrl}/apply`,
    track: (ref?: string) => (ref ? `${baseUrl}/track-loan?ref=${encodeURIComponent(ref)}` : `${baseUrl}/track-loan`),
    customerPortal: `${baseUrl}/customer`,
    support: (chatToken?: string) => (chatToken ? `${baseUrl}/support?chatToken=${encodeURIComponent(chatToken)}` : `${baseUrl}/support`),
    terms: `${baseUrl}/terms-and-conditions`,
    privacy: `${baseUrl}/privacy-policy`
  };
}

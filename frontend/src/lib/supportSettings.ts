import { useState, useEffect } from 'react';

export interface SupportSettings {
  supportPhone: string;
  supportEmail: string;
  supportWhatsapp: string;
  supportHours: string;
  headquartersAddress: string;
}

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  supportPhone: '+254 700 123 456',
  supportEmail: 'support@jijengeloans.co.ke',
  supportWhatsapp: '+254 700 123 456',
  supportHours: '24/7 Customer Support',
  headquartersAddress: 'Nairobi, Kenya',
};

let cachedSettings: SupportSettings = { ...DEFAULT_SUPPORT_SETTINGS };
const listeners = new Set<(settings: SupportSettings) => void>();

export function getCachedSupportSettings(): SupportSettings {
  return cachedSettings;
}

export function updateLocalSupportSettings(newSettings: Partial<SupportSettings>) {
  cachedSettings = { ...cachedSettings, ...newSettings };
  listeners.forEach((l) => l(cachedSettings));
}

export async function fetchSupportSettings(): Promise<SupportSettings> {
  try {
    const res = await fetch('/api/support/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        cachedSettings = { ...DEFAULT_SUPPORT_SETTINGS, ...data.settings };
        listeners.forEach((l) => l(cachedSettings));
        return cachedSettings;
      }
    }
  } catch (e) {
    console.error('Failed to fetch support settings:', e);
  }
  return cachedSettings;
}

export function useSupportSettings() {
  const [settings, setSettings] = useState<SupportSettings>(cachedSettings);

  useEffect(() => {
    fetchSupportSettings();
    const handler = (newSettings: SupportSettings) => setSettings(newSettings);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return settings;
}

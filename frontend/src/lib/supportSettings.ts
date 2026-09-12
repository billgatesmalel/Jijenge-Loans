import { useState, useEffect } from 'react';
import { apiFetch } from './api';

export interface SupportSettings {
  supportPhone: string;
  supportEmail: string;
  supportWhatsapp: string;
  supportHours: string;
  headquartersAddress: string;
}

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  supportPhone: '+254 781746850',
  supportEmail: 'jijengeloanssupport@smartsystems.top',
  supportWhatsapp: '+254 781746850',
  supportHours: '24/7 Customer Support',
  headquartersAddress: 'Nairobi, Kenya',
};

// Initialize cachedSettings from localStorage if available
const getInitialSettings = (): SupportSettings => {
  try {
    const saved = localStorage.getItem('bl_support_settings');
    if (saved) {
      return { ...DEFAULT_SUPPORT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    /* ignore parsing errors */
  }
  return { ...DEFAULT_SUPPORT_SETTINGS };
};

let cachedSettings: SupportSettings = getInitialSettings();
const listeners = new Set<(settings: SupportSettings) => void>();

export function getCachedSupportSettings(): SupportSettings {
  return cachedSettings;
}

export function updateLocalSupportSettings(newSettings: Partial<SupportSettings>) {
  cachedSettings = { ...cachedSettings, ...newSettings };
  try {
    localStorage.setItem('bl_support_settings', JSON.stringify(cachedSettings));
  } catch {
    /* ignore storage errors */
  }
  listeners.forEach((l) => l(cachedSettings));
}

export async function fetchSupportSettings(): Promise<SupportSettings> {
  try {
    const res = await apiFetch('/api/support/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        cachedSettings = { ...DEFAULT_SUPPORT_SETTINGS, ...data.settings };
        try {
          localStorage.setItem('bl_support_settings', JSON.stringify(cachedSettings));
        } catch {}
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

/* ==========================================================================
   Jijenge Loans - Centralized Design Tokens (Theme System)
   ========================================================================== */

export const THEME = {
  colors: {
    // Brand Palette
    orange: '#FF6600',
    orangeHover: '#E55C00',
    orangeLight: '#FFF5ED',
    navy: '#0F172A',
    navyHover: '#1E293B',
    bgPage: '#FFFFFF',

    // Neutral Typography
    textHeadline: '#0F172A',
    textBody: '#475569',
    textMuted: '#64748B',

    // Semantic Statuses (Unifying Green, Amber, Red, Blue)
    success: '#10B981',
    successHover: '#059669',
    successLight: '#ECFDF5',
    successText: '#047857',
    successBorder: '#A7F3D0',

    warning: '#F59E0B',
    warningHover: '#D97706',
    warningLight: '#FFFBEB',
    warningText: '#B45309',
    warningBorder: '#FDE68A',

    error: '#EF4444',
    errorHover: '#DC2626',
    errorLight: '#FEF2F2',
    errorText: '#991B1B',
    errorBorder: '#FECACA',

    info: '#0284C7',
    infoHover: '#0369A1',
    infoLight: '#F0F9FF',
    infoText: '#0369A1',
    infoBorder: '#BAE6FD',

    // Borders & UI
    borderLight: '#E2E8F0',
    borderFocus: '#FF6600',
    pillBg: '#F8FAFC',
  },

  shadows: {
    sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 16px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03)',
    lg: '0 10px 32px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
    orange: '0 6px 20px rgba(255, 102, 0, 0.28)',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
  },

  heights: {
    nav: '64px',
    btn: '48px',
    input: '48px',
  },

  transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

export default THEME;

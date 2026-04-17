export const Colors = {
  // Background system
  background: {
    base: '#0A0A0F',
    surface: '#111118',
    raised: '#1A1A24',
  },

  // Primary teal
  teal: {
    main: '#1B8A8F',
    bright: '#3AAFB5',
    light: '#5DD8DE',
    tagBg: '#1A3538',
    tagBgAlpha: 'rgba(27,138,143,0.2)',
    tagBorderAlpha: 'rgba(27,138,143,0.3)',
    verifiedBg: 'rgba(27,138,143,0.15)',
    pressed: '#167377',
  },

  // Accent rose
  rose: {
    main: '#D46B9E',
    soft: '#E88FB5',
    bannerBg: '#3A1A28',
    bannerBgAlpha: 'rgba(212,107,158,0.15)',
    bannerBorderAlpha: 'rgba(212,107,158,0.25)',
    avatarBgAlpha: 'rgba(212,107,158,0.25)',
  },

  // Glass card system
  glass: {
    default: 'rgba(255,255,255,0.10)',
    subtle: 'rgba(255,255,255,0.06)',
    hover: 'rgba(255,255,255,0.15)',
    border: 'rgba(255,255,255,0.18)',
    divider: 'rgba(255,255,255,0.08)',
    iconBg: 'rgba(255,255,255,0.08)',
    iconBorder: 'rgba(255,255,255,0.12)',
  },

  // Ghost button
  ghost: {
    bg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.15)',
    bgPressed: 'rgba(255,255,255,0.15)',
  },

  // Text opacity hierarchy
  text: {
    primary: '#FFFFFF',          // 100%
    body: 'rgba(255,255,255,0.70)',    // 70%
    label: 'rgba(255,255,255,0.50)',   // 50%
    hint: 'rgba(255,255,255,0.30)',    // 30%
    inactive: 'rgba(255,255,255,0.35)', // inactive nav
    icon: 'rgba(255,255,255,0.70)',    // default icon
  },

  // Navigation bar
  nav: {
    background: 'rgba(10,10,15,0.92)',
    border: 'rgba(255,255,255,0.06)',
    active: '#1B8A8F',
    inactive: 'rgba(255,255,255,0.35)',
  },

  // Error
  error: '#E24B4A',
} as const;

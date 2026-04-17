export const Typography = {
  // Font sizes
  size: {
    wordmark: 30,
    screenTitle: 22,
    cardTitle: 14,
    cardSubtitle: 11,
    sectionLabel: 11,
    body: 12,
    tag: 10,
    button: 12,
    navLabel: 9,
    timestamp: 9,
  },

  // Font weights
  weight: {
    wordmark: '800' as const,
    screenTitle: '600' as const,
    cardTitle: '500' as const,
    cardSubtitle: '400' as const,
    sectionLabel: '500' as const,
    body: '400' as const,
    tag: '500' as const,
    button: '500' as const,
    navLabel: '400' as const,
    timestamp: '400' as const,
  },

  // Letter spacing
  letterSpacing: {
    wordmark: -0.5,
    sectionLabel: 0.5,
  },

  // Line heights (multiplier)
  lineHeight: {
    body: 1.4,
  },
} as const;

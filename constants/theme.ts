export const COLORS = {
  // Surfaces
  background: '#F7F4ED',   // app background
  card: '#FFFDFC',         // cards, panels

  // Text
  text: '#1F2933',         // main text
  textSecondary: '#6B7280',

  // Brand
  accent: '#B08A3E',       // gold (buttons, key links)
  accentPressed: '#9A7833',
  accentSoft: '#F3E6CC',   // soft gold tint for chips/badges

  // Status
  error: '#790919',

  // Utility
  border: '#E8E1D4',
  white: '#FFFFFF',
};

// constants/typography.ts
export const TYPOGRAPHY = {
  headingFont: 'Raleway-Regular', 
  bodyFont: 'PlaywriteDEGrund-Regular', 
};


export const PRODUCT_TYPES = [
  "dip",
  "gel",
  "polish",
  "acrylic",
];

export const OTHER_TYPES = [
  'tool',
  'formula',
  'stickers',
];

export const THEME = {
  colors: COLORS,

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

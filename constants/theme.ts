export const COLORS = {
  background: '#f7f4ef',
  card: '#ffffff',
  border: '#e8e0d0',
  accent: '#B08A3E',
  accentSoft: '#f5eddb',
  text: '#2c2418',
  textSecondary: '#8a7a62',
  white: '#ffffff',
  error: '#c0392b',
  success: '#27ae60',
};

export const FONTS = {
  heading: { fontWeight: '700' as const },
  body: { fontWeight: '400' as const },
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
};

export const SHADOW = {
  small: {
    shadowColor: '#B08A3E',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#B08A3E',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
};
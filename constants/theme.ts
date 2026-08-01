// theme.ts

export const COLORS = {
  background: '#FAFAFA',       // Near-white
  card: '#F2F2F2',             // Light gray surface
  text: '#1A1A1A',             // Near-black
  textSecondary: '#6B6B6B',    // Mid gray
  accent: '#1A1A1A',           // Near-black — buttons, active states, icons
  accentHover: '#3A3A3A',      // Lighter charcoal — the "pressed" enhancement
  accentSoft: '#EDEDED',       // Light gray tint for chips/highlights
  border: '#E0E0E0',
  white: '#FFFFFF',
  error: '#B3474D',            // Muted rose-red, matches the dip badge tone
  success: '#4A6B56',          // Muted sage, matches the gel badge tone
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
};

export const SHADOW = {
  small: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
};

export const FONTS = {
  heading: 'Playfair Display, Georgia, serif',
  body: 'Inter, system-ui, sans-serif',
};

export const FONT_WEIGHTS = {
  heading: { fontWeight: '700' as const },
  body: { fontWeight: '400' as const },
};

// Formula/product type badge colors (dip, gel, lacquer) — used wherever
// you tag product/formula type with a colored pill
export const BADGES = {
  dip: { bg: '#F5E6E8', text: '#8A5A62' },
  gel: { bg: '#E8EFE9', text: '#4A6B56' },
  lacquer: { bg: '#E6ECF5', text: '#566A8A' },
};

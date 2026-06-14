/** Identidad oficial MOVI — no usar MOVÍ, Móvi ni variantes. */
export const brand = {
  black: '#000000',
  red: '#E53935',
  white: '#FFFFFF',
} as const;

/** Tamaños del wordmark (+18% vs. versión anterior). */
export const LOGO_FONT_SIZES = {
  sm: 26,
  md: 38,
  lg: 52,
  xl: 60,
} as const;

export const LOGO_DOT_SIZES = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
} as const;

export const TAGLINE_PRIMARY =
  'MOVI — La plataforma de movilidad, entregas y logística de El Salvador.';

export const VALUE_PROPOSITION_PASSENGER =
  'Viajes, entregas y paquetería al mejor precio.';

export const TAGLINE_SECONDARY = VALUE_PROPOSITION_PASSENGER;

export const VALUE_PROPOSITION_DRIVER =
  'Conserva el 100% de tus ganancias. Primer mes gratis.';

export const TAGLINE_DRIVER = VALUE_PROPOSITION_DRIVER;

export const SUBSCRIPTION_PRICE_USD = 7;

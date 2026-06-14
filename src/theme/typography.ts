import { TextStyle } from 'react-native';

export const typography = {
  hero: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  } as TextStyle,
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
  } as TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
  } as TextStyle,
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500',
  } as TextStyle,
  caption: {
    fontSize: 14,
    fontWeight: '400',
  } as TextStyle,
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  } as TextStyle,
  button: {
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  price: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
} as const;

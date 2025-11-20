/**
 * Color definitions for The Golden Olive restaurant website
 * Maintains the original color scheme: Gold, Black, White
 */

export const colors = {
  // Golden color palette - using Bootstrap warning colors
  golden: '#ffc107',
  goldenLight: '#ffcd39',
  goldenDark: '#e6ac00',
  
  // Dark color palette - pure black
  darkCustom: '#000000',
  darkLight: '#212529',
  
  // Modern UI enhancements
  glassBg: 'rgba(0, 0, 0, 0.4)',
  glassBorder: 'rgba(255, 193, 7, 0.2)',
  
  // Shadows
  shadowSm: '0 2px 8px rgba(0, 0, 0, 0.1)',
  shadowMd: '0 4px 16px rgba(0, 0, 0, 0.2)',
  shadowLg: '0 8px 32px rgba(0, 0, 0, 0.3)',
  shadowGolden: '0 8px 32px rgba(255, 193, 7, 0.3)',
  shadowGoldenLg: '0 16px 48px rgba(255, 193, 7, 0.4)',
  
  // Standard colors
  white: '#ffffff',
  black: '#000000',
} as const;

// CSS variable names for use in styled components
export const cssVariables = {
  '--bs-golden': colors.golden,
  '--bs-golden-light': colors.goldenLight,
  '--bs-golden-dark': colors.goldenDark,
  '--bs-dark-custom': colors.darkCustom,
  '--bs-dark-light': colors.darkLight,
  '--glass-bg': colors.glassBg,
  '--glass-border': colors.glassBorder,
  '--shadow-sm': colors.shadowSm,
  '--shadow-md': colors.shadowMd,
  '--shadow-lg': colors.shadowLg,
  '--shadow-golden': colors.shadowGolden,
  '--shadow-golden-lg': colors.shadowGoldenLg,
} as const;

// Bootstrap-compatible color classes
export const colorClasses = {
  bgGolden: 'bg-warning',
  bgGoldenLight: 'bg-warning',
  bgGoldenDark: 'bg-warning',
  bgDarkCustom: 'bg-dark',
  bgDarkLight: 'bg-secondary',
  textGolden: 'text-warning',
  textGoldenLight: 'text-warning',
  textGoldenDark: 'text-warning',
  borderGolden: 'border-warning',
  borderDarkLight: 'border-secondary',
} as const;

export default colors;


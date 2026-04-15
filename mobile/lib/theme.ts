const lightColors = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#10B981',
  
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentLight: '#FBBF24',
  
  secondary: '#F87171',
  secondaryDark: '#EF4444',
  
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F4',
  
  text: {
    primary: '#1C1917',
    secondary: '#57534E',
    tertiary: '#78716C',
    disabled: '#A8A29E',
  },
  
  border: '#E7E5E4',
  borderLight: '#F5F5F4',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  gradient: {
    primary: ['#059669', '#10B981'] as const,
    accent: ['#F59E0B', '#FBBF24'] as const,
    warm: ['#F59E0B', '#F87171'] as const,
  },
};

const darkColors = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  
  accent: '#FBBF24',
  accentDark: '#F59E0B',
  accentLight: '#FCD34D',
  
  secondary: '#EF4444',
  secondaryDark: '#DC2626',
  
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  
  text: {
    primary: '#F1F5F9',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    disabled: '#64748B',
  },
  
  border: '#334155',
  borderLight: '#475569',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#FBBF24',
  info: '#3B82F6',
  
  gradient: {
    primary: ['#059669', '#10B981'] as const,
    accent: ['#F59E0B', '#FBBF24'] as const,
    warm: ['#F59E0B', '#F87171'] as const,
  },
};

export const themes = {
  light: {
    colors: lightColors,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      full: 9999,
    },
    
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 40,
    },
    
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      },
      xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
      },
    },
  },
  dark: {
    colors: darkColors,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      full: 9999,
    },
    
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 40,
    },
    
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
      },
      xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 8,
      },
    },
  },
};

// Legacy export for backward compatibility
export const theme = themes.light;

export type Theme = typeof themes.light;
export type ThemeMode = 'light' | 'dark' | 'system';

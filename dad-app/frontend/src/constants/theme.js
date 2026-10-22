// theme.js
// Refined design system for D.A.D. (Diagnose Anything Daily)

const theme = {
  colors: {
    background: '#F6F5F0',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF3EE',
    surfaceRaised: '#FFFEFB',

    primary: '#355F48',
    primaryPressed: '#2C4E3C',

    accent: '#9C6B2F',

    text: '#1F2A1F',
    subtext: '#667064',

    border: '#CCD6CC',

    warning: '#A24A2A',
    warningBackground: '#FFF1EA',
    warningText: '#6F2D16',
    warningBorder: '#DDAE9F',

    success: '#3F7D5C',
    danger: '#B3261E',

    white: '#FFFFFF',
    shadow: '#000000',

    cardHighlight: '#F8F7F1',
    heroSubtext: 'rgba(255,255,255,0.86)',
    heroPrompt: 'rgba(255,255,255,0.96)',
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    xxl: 36,
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 26,
    pill: 999,
  },

  typography: {
    caption: 12,
    helper: 14,
    body: 16,
    bodyLarge: 18,
    sectionHeading: 19,
    screenTitle: 23,
    screenSubtitle: 14,
    title: 24,
    heading: 32,
  },

  layout: {
    bottomNavigationHeight: 68,
    repairActionBarHeight: 82,
  },

  shadow: {
    card: {
      shadowColor: '#142419',
      shadowOpacity: 0.055,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 3,
    },
    cardElevated: {
      shadowColor: '#142419',
      shadowOpacity: 0.09,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    nav: {
      shadowColor: '#142419',
      shadowOpacity: 0.12,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
    raisedSoft: {
      shadowColor: '#142419',
      shadowOpacity: 0.07,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 9 },
      elevation: 4,
    },
    soft: {
      shadowColor: '#142419',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },
};

export default theme;

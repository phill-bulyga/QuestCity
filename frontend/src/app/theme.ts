import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: false
    sm: false
    md: false
    lg: false
    xl: false
    mobile: true
    tablet: true
    laptop: true
    desktop: true
  }
}

export const theme = createTheme({
  breakpoints: {
    values: {
      mobile: 0,
      tablet: 640,
      laptop: 1024,
      desktop: 1280,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#6f2cff',
      dark: '#4e14c8',
      light: '#9a6bff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#145cc7',
    },
    background: {
      default: '#faf9fd',
      paper: '#ffffff',
    },
    text: { primary: '#211934', secondary: '#70677e' },
    divider: '#e9e4f2',
    success: {
      main: '#168765',
    },
    warning: {
      main: '#d66b13',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'Inter, Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.035em' },
    h2: { fontSize: '1.5rem', lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.15rem', lineHeight: 1.3, fontWeight: 700 },
    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 48, borderRadius: 10, paddingInline: 20 },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true },
    },
    MuiInputLabel: {
      styleOverrides: {
        outlined: {
          '@media (max-width:639px)': {
            position: 'static', transform: 'none', maxWidth: '100%',
            whiteSpace: 'normal', fontSize: 14, lineHeight: 1.5, marginBottom: 8,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44, flexShrink: 0 } },
    },
    MuiTypography: {
      styleOverrides: { root: { overflowWrap: 'anywhere', minWidth: 0 } },
    },
    MuiContainer: {
      styleOverrides: { root: { paddingInline: 20, '@media (min-width:640px)': { paddingInline: 32 } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10, backgroundColor: '#ffffff', minWidth: 0,
          '@media (max-width:639px)': { '& input, & textarea, & .MuiSelect-select': { fontSize: 16 } },
        },
        notchedOutline: { borderColor: '#dcd5e8', '@media (max-width:639px)': { '& legend': { display: 'none' } } },
      },
    },
    MuiPaper: {
      styleOverrides: { outlined: { borderColor: '#e9e4f2' } },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 16, '&:last-child': { paddingBottom: 16 }, '@media (min-width:640px)': { padding: 32, '&:last-child': { paddingBottom: 32 } } } },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 }, clickable: { minHeight: 44 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 10, '@media (max-width:639px)': { margin: 16, width: 'calc(100% - 32px)', maxHeight: 'calc(100dvh - 32px)' } } } },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 10, border: '1px solid #e9e4f2', boxShadow: '0 8px 28px rgba(41, 22, 78, 0.04)' },
      },
    },
  },
})

import { createTheme } from '@mui/material/styles';

// Paleta de cores sugerida para um visual profissional e moderno
const theme = createTheme({
  palette: {
    primary: {
      main: '#5287fb', // Azul oficial da marca
      light: '#7aa5fc',
      dark: '#3a5eb0',
      lighter: 'rgba(82, 135, 251, 0.08)',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#74ca4f', // Verde oficial da marca
      light: '#90d56f',
      dark: '#518d37',
      lighter: 'rgba(116, 202, 79, 0.08)',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      lighter: 'rgba(239, 68, 68, 0.08)',
    },
    warning: {
      main: '#f59e0b',
      lighter: 'rgba(245, 158, 11, 0.08)',
    },
    info: {
      main: '#3b82f6',
      lighter: 'rgba(59, 130, 246, 0.08)',
    },
    success: {
      main: '#22c55e',
      lighter: 'rgba(34, 197, 94, 0.08)',
    },
    background: {
      default: '#F4F6F8', // Um fundo cinza claro para não cansar a vista
      paper: '#FFFFFF',
    },
    text: {
      primary: '#34495E', // Cor de texto principal
      secondary: '#5D6D7E', // Cor de texto secundário
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // Bordas levemente arredondadas para um toque moderno
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Botões com texto em capitalização normal
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
      defaultProps: {
        variant: 'contained',
        disableElevation: true,
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05)', // Sombra sutil para os cards
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      }
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          padding: 0,
        }
      }
    }
  }
});

export default theme;

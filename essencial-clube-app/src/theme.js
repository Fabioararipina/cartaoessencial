import { createTheme } from '@mui/material/styles';

// Paleta de cores sugerida para um visual profissional e moderno
const theme = createTheme({
  palette: {
    primary: {
      main: '#5287fb', // Azul oficial da marca
    },
    secondary: {
      main: '#74ca4f', // Verde oficial da marca
    },
    background: {
      default: '#F4F6F8', // Um fundo cinza claro para não cansar a vista
      paper: '#FFFFFF',
    },
    text: {
      primary: '#34495E', // Cor de texto principal
      secondary: '#5D6D7E', // Cor de texto secundário
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
    }
  }
});

export default theme;

import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'; // Renomear Link para RouterLink
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png'; // Caminho ajustado para assets

import {
  Box, Button, TextField, Typography, Container, Paper,
  CircularProgress, IconButton, InputAdornment, Alert, Divider, Link,
  FormControlLabel, Checkbox
} from '@mui/material';
import {
  Email as EmailIcon, Lock as LockIcon, Visibility, VisibilityOff,
  Login as LoginIcon, Add as AddIcon, ArrowForward as ArrowForwardIcon // Adicionar ArrowForwardIcon
} from '@mui/icons-material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, senha);

    if (result.success) {
      const redirectPath = getRedirectPath(result.user.tipo);
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const getRedirectPath = (tipo) => {
    switch (tipo) {
      case 'admin':
        return '/admin';
      case 'parceiro':
        return '/parceiro';
      case 'cliente':
        return '/dashboard';
      default:
        return from; // Fallback para o caminho original ou dashboard
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Lado esquerdo - Branding (Visível apenas em telas maiores) */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '50%',
          background: 'linear-gradient(45deg, #5287fb 30%, #74ca4f 90%)', // Cores da marca
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          p: 8,
        }}
      >
        {/* Background decorativo */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              borderRadius: '50%',
              backgroundColor: 'white',
              filter: 'blur(80px)',
            },
            '&::before': {
              top: '10%',
              left: '10%',
              width: 300,
              height: 300,
            },
            '&::after': {
              bottom: '10%',
              right: '10%',
              width: 400,
              height: 400,
            },
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 500 }}>
          <Box sx={{ mb: 6 }}>
            <img src={logo} alt="Essencial Clube" style={{ height: 80, filter: 'brightness(0) invert(1)' }} />
          </Box>

          <Typography variant="h3" component="h1" fontWeight="bold" sx={{ mb: 3, lineHeight: 1.2 }}>
            Bem-vindo ao<br />
            <Typography component="span" variant="h3" sx={{ color: 'rgba(255,255,255,0.9)' }}>Cartão Essencial Saúde</Typography>
          </Typography>

          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mb: 6, maxWidth: 'md' }}>
            Acumule pontos, resgate prêmios exclusivos e aproveite benefícios incríveis para você e sua família.
          </Typography>

          {/* Benefícios */}
          <Box sx={{ '& > div': { display: 'flex', alignItems: 'center', gap: 2, mb: 2 } }}>
            {[
              { icon: '✨', text: 'Ganhe pontos a cada compra' },
              { icon: '🎁', text: 'Resgate prêmios exclusivos' },
              { icon: '👥', text: 'Indique amigos e ganhe mais' },
            ].map((item, i) => (
              <Box key={i}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="body1" fontWeight="medium">{item.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Lado direito - Formulário de Login */}
      <Container
        component="main"
        maxWidth="xs"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flexGrow: 1,
          bgcolor: 'background.default',
          py: 4,
          px: { xs: 2, sm: 3, lg: 0 }
        }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', borderRadius: '12px' }}>
          {/* Logo mobile */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: 'center', mb: 4 }}>
            <img src={logo} alt="Essencial Clube" style={{ height: 64, width: 'auto' }} />
          </Box>

          <Box sx={{ textAlign: { xs: 'center', lg: 'left' }, mb: 4 }}>
            <Typography variant="h4" component="h2" fontWeight="bold" sx={{ mb: 1 }}>
              Acesse sua conta
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Entre para continuar aproveitando seus benefícios
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            {/* O checkbox "Lembrar-me" e "Esqueceu a senha?" */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              {/* Mantido o FormControlLabel e Checkbox para "Lembrar-me", caso a funcionalidade seja adicionada */}
              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                label="Lembrar-me"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
              <Link component={RouterLink} to="/esqueci-senha" variant="body2" sx={{ ml: 'auto' }}>
                Esqueceu a senha?
              </Link>
            </Box>


            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2, mb: 2, py: 1.5 }}
              disabled={loading}
              endIcon={loading ? null : <ArrowForwardIcon />} // Ícone de seta para 'Entrar'
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Entrar'}
            </Button>

            <Divider sx={{ my: 3 }}>ou</Divider>

            <Button
              component={RouterLink} // Usar RouterLink para navegação interna
              to="/cadastro"
              fullWidth
              variant="outlined"
              sx={{ mt: 1, py: 1.5 }}
              startIcon={<AddIcon />}
            >
              Criar nova conta
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
            Ao continuar, você concorda com nossos{' '}
            <Link component={RouterLink} to="/termos-de-uso" color="primary">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link component={RouterLink} to="/politica-de-privacidade" color="primary">
              Política de Privacidade
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}


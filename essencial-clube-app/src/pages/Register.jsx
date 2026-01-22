import React, { useState } from 'react';
import {
  Container, Box, Typography, TextField, Button, CircularProgress,
  Alert, Link as MuiLink
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    telefone: '' // Optional
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateCpf = (cpf) => {
    // Basic CPF validation (only digits, 11 characters)
    if (!cpf || !/^\d{11}$/.test(cpf)) {
      return 'CPF inválido. Deve conter 11 dígitos.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const cpfError = validateCpf(formData.cpf);
    if (cpfError) {
      setError(cpfError);
      setLoading(false);
      return;
    }

    try {
      await authService.register(formData);
      setSuccess('Cadastro realizado com sucesso! Você já pode fazer login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao realizar cadastro. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 5, p: 3, borderRadius: 2, boxShadow: 3, bgcolor: 'background.paper' }}>
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Cadastre-se
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Crie sua conta para começar a ganhar pontos!
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          required
          label="Nome Completo"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          required
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          required
          label="CPF (apenas números)"
          name="cpf"
          value={formData.cpf}
          onChange={handleChange}
          margin="normal"
          inputProps={{ maxLength: 11 }}
          error={!!error && error.includes('CPF')}
          helperText={error.includes('CPF') ? error : ''}
        />
        <TextField
          fullWidth
          label="Telefone (opcional)"
          name="telefone"
          value={formData.telefone}
          onChange={handleChange}
          margin="normal"
          inputProps={{ maxLength: 11 }}
        />
        <TextField
          fullWidth
          required
          label="Senha"
          type="password"
          name="senha"
          value={formData.senha}
          onChange={handleChange}
          margin="normal"
        />

        {error && !error.includes('CPF') && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Criar Conta'}
        </Button>
      </form>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2">
          Já tem uma conta?{' '}
          <MuiLink component={Link} to="/login" variant="body2">
            Faça Login
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  );
}
import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, TextField, Button, CircularProgress,
  Alert, Paper, InputAdornment
} from '@mui/material';
import { adminService } from '../../services/api'; // Supondo que o adminService seja exportado de api.js

export default function AdminSystemConfigs() {
  const [configs, setConfigs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const response = await adminService.getSystemConfigs();
        setConfigs(response.data);
      } catch (err) {
        setError('Erro ao carregar configurações do sistema.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Garante que o valor seja apenas numérico
    const numericValue = value.replace(/[^0-9]/g, '');
    setConfigs(prev => ({
      ...prev,
      [name]: { ...prev[name], value: numericValue }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Prepara os dados para enviar (apenas a chave e o valor)
      const dataToUpdate = {
        CANCELLATION_FEE_PERCENTAGE: configs.CANCELLATION_FEE_PERCENTAGE.value
      };
      await adminService.updateSystemConfigs(dataToUpdate);
      setSuccess('Configurações salvas com sucesso!');
    } catch (err) {
      setError('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !configs) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Configurações do Sistema
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {configs && (
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Multa por Cancelamento
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {configs.CANCELLATION_FEE_PERCENTAGE.description}
              </Typography>
              <TextField
                fullWidth
                label="Percentual da Multa"
                name="CANCELLATION_FEE_PERCENTAGE"
                value={configs.CANCELLATION_FEE_PERCENTAGE.value}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{
                  maxLength: 3,
                }}
                sx={{ maxWidth: 300 }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar Configurações'}
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
}

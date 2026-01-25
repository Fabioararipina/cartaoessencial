import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, TextField, Button, CircularProgress,
  Alert, Paper, InputAdornment, Grid, Divider
} from '@mui/material';
import { adminService } from '../../services/api';

export default function AdminSystemConfigs() {
  const [configs, setConfigs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const response = await adminService.getSystemConfigs();
        setConfigs(response.data);
      } catch (err) {
        setError('Erro ao carregar configuracoes do sistema.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Permite numeros e ponto decimal para valores monetarios
    const numericValue = value.replace(/[^0-9.]/g, '');
    setConfigs(prev => ({
      ...prev,
      [name]: { ...prev[name], value: numericValue }
    }));
  };

  const handleIntegerChange = (e) => {
    const { name, value } = e.target;
    // Apenas numeros inteiros
    const intValue = value.replace(/[^0-9]/g, '');
    setConfigs(prev => ({
      ...prev,
      [name]: { ...prev[name], value: intValue }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Prepara os dados para enviar (apenas a chave e o valor)
      const dataToUpdate = {};
      if (configs.PLAN_BASE_VALUE) dataToUpdate.PLAN_BASE_VALUE = configs.PLAN_BASE_VALUE.value;
      if (configs.FREE_DEPENDENTS_LIMIT) dataToUpdate.FREE_DEPENDENTS_LIMIT = configs.FREE_DEPENDENTS_LIMIT.value;
      if (configs.EXTRA_DEPENDENT_VALUE) dataToUpdate.EXTRA_DEPENDENT_VALUE = configs.EXTRA_DEPENDENT_VALUE.value;
      if (configs.INSTALLMENT_COUNT) dataToUpdate.INSTALLMENT_COUNT = configs.INSTALLMENT_COUNT.value;
      if (configs.CANCELLATION_FEE_PERCENTAGE) dataToUpdate.CANCELLATION_FEE_PERCENTAGE = configs.CANCELLATION_FEE_PERCENTAGE.value;

      await adminService.updateSystemConfigs(dataToUpdate);
      setSuccess('Configuracoes salvas com sucesso!');
    } catch (err) {
      setError('Erro ao salvar configuracoes.');
    } finally {
      setSaving(false);
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
        Configuracoes do Sistema
      </Typography>

      <Paper sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {configs && (
          <form onSubmit={handleSubmit}>
            {/* Secao: Valores do Plano */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Valores do Plano
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure os valores base do plano mensal e quantidade de parcelas
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor da Mensalidade"
                    name="PLAN_BASE_VALUE"
                    value={configs.PLAN_BASE_VALUE?.value || ''}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                    helperText={configs.PLAN_BASE_VALUE?.description || 'Valor base do plano mensal'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Parcelas do Carne"
                    name="INSTALLMENT_COUNT"
                    value={configs.INSTALLMENT_COUNT?.value || ''}
                    onChange={handleIntegerChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">x</InputAdornment>,
                    }}
                    helperText={configs.INSTALLMENT_COUNT?.description || 'Quantidade de parcelas anuais'}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Secao: Dependentes */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Dependentes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure a quantidade de dependentes gratuitos e valor adicional por dependente extra
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Dependentes Gratuitos"
                    name="FREE_DEPENDENTS_LIMIT"
                    value={configs.FREE_DEPENDENTS_LIMIT?.value || ''}
                    onChange={handleIntegerChange}
                    helperText={configs.FREE_DEPENDENTS_LIMIT?.description || 'Quantidade inclusos no plano base'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Dependente Extra"
                    name="EXTRA_DEPENDENT_VALUE"
                    value={configs.EXTRA_DEPENDENT_VALUE?.value || ''}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                    helperText={configs.EXTRA_DEPENDENT_VALUE?.description || 'Valor adicional por dependente extra'}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Secao: Outros */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Outras Configuracoes
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Multa por Cancelamento"
                    name="CANCELLATION_FEE_PERCENTAGE"
                    value={configs.CANCELLATION_FEE_PERCENTAGE?.value || ''}
                    onChange={handleIntegerChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    helperText={configs.CANCELLATION_FEE_PERCENTAGE?.description || 'Percentual cobrado no cancelamento'}
                  />
                </Grid>
              </Grid>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={saving}
              sx={{ mt: 2 }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Salvar Configuracoes'}
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
}
